import os
import json
import uuid
import time
from datetime import datetime
from typing import Literal, Dict, Any, List, Optional
from dotenv import load_dotenv
from e2b_code_interpreter import Sandbox
from e2b.sandbox.sandbox_api import SandboxQuery
from langchain_core.tools import tool
from langchain_core.runnables.config import RunnableConfig
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, MessagesState, START, END
from pydantic import BaseModel, Field
from .prompt import SYSTEM_PROMPT

load_dotenv()

# Configuration
TEMPLATE_NAME = "lovable-clone"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# ========================
# SANDBOX MANAGEMENT
# ========================

class ProjectSession:
    """Manages persistent project sessions across conversations"""
    
    @staticmethod
    def create_new_sandbox(user_id: str, project_id: str) -> tuple[Sandbox, str]:
        """Create a new sandbox with metadata for a project"""
        sandbox = Sandbox(
            template=TEMPLATE_NAME,
            timeout= 600,
            metadata={
                "user_id": user_id,
                "project_id": project_id,
                "created_at": datetime.now().isoformat(),
                "session_type": "new"
            }
        )
        
        return sandbox, project_id
    
    @staticmethod
    def find_existing_sandbox(user_id: str, project_id: str) -> Optional[Sandbox]:
        """Find existing sandbox by user_id and project_id"""
        try:
            sandboxes = Sandbox.list(
                query=SandboxQuery(
                    metadata={
                        "user_id": user_id,
                        "project_id": project_id
                    }
                )
            )
            
            if sandboxes:
                sandbox_info = sandboxes[0]  # Get the first matching sandbox
                sandbox = Sandbox.connect(sandbox_info.sandbox_id)
                return sandbox
            else:
                return None
                
        except Exception as e:
            return None

# ========================
# STATE DEFINITION
# ========================

class State(MessagesState):
    """State for the code generation agent"""
    sandbox: Any  # E2B Sandbox instance
    sandbox_id: str
    sandbox_url: str
    files_created: Dict[str, str]
    # Session management fields
    session_type: str = "new"  # "new" or "continuing"
    conversation_history: str = ""  # Previous conversation summary
    user_id: str = ""  # User identifier
    project_id: str = ""  # Project identifier
    model: str = "google/gemini-2.5-flash"  # Model to use for LLM calls

# ========================
# PYDANTIC MODELS FOR TOOL SCHEMAS
# ========================

class FileToCreate(BaseModel):
    """Schema for a single file to create/update"""
    path: str = Field(description="Relative file path like 'components/Button.tsx' or 'app/page.tsx'")
    content: str = Field(description="Complete file content as a string")

class CreateFilesInput(BaseModel):
    """Schema for create_or_update_files tool input"""
    files: List[FileToCreate] = Field(description="List of files to create or update")

class TerminalInput(BaseModel):
    """Schema for terminal tool input"""
    command: str = Field(description="Terminal command to execute")

class ReadFilesInput(BaseModel):
    """Schema for read_files tool input"""  
    file_paths: List[str] = Field(description="List of file paths to read")

class TaskComplete(BaseModel):
    """Schema for task_complete tool input"""
    summary: str = Field(description="Summary of what was accomplished")
    files_created: List[str] = Field(description="List of file paths that were created or modified")

# ========================
# TOOL DEFINITIONS
# ========================

@tool(args_schema=TerminalInput)
def terminal(command: str, config: RunnableConfig) -> str:
    """Use the terminal to run commands in the sandbox."""
    try:
        sandbox = config["configurable"]["sandbox"]
        
        # Send user-friendly message via stream callback (if available)
        if "npm install" in command:
            print(f"📦 Installing the necessary packages for your app...")
        else:
            print(f"⚙️ Running some setup commands for your app...")
        
        # Actually run the command and return the output for the LLM
        result = sandbox.commands.run(command)
        output = result.stdout if result.stdout else ""
        if result.stderr:
            output += f"\nSTDERR: {result.stderr}"
        
        return output  # Return actual output for LLM decision making
            
    except Exception as e:
        error_msg = f"Command failed: {e}"
        print(f"😅 Sorry, I had trouble running some setup commands: {e}")
        return error_msg

@tool(args_schema=CreateFilesInput)
def create_or_update_files(files: List[FileToCreate], config: RunnableConfig) -> str:
    """Create or update files in the sandbox."""
    try:
        sandbox = config["configurable"]["sandbox"]
        results = []
        
        for i, file in enumerate(files):
            sandbox.files.write(file.path, file.content)
            
            # Verify the file was written
            try:
                written_content = sandbox.files.read(file.path)
                results.append(f"Successfully created {file.path}")
            except Exception as verify_error:
                results.append(f"Created {file.path} (may need to verify)")
        
        return f"Great! I've created {len(files)} file{'s' if len(files) != 1 else ''} for your app."
    except Exception as e:
        return f"Sorry, I had trouble creating some files: {e}"

@tool(args_schema=ReadFilesInput)  
def read_files(file_paths: List[str], config: RunnableConfig) -> str:
    """Read files from the sandbox."""
    try:
        sandbox = config["configurable"]["sandbox"]
        
        # Send user-friendly message
        print(f"🔍 I'm reviewing your existing code to understand what you already have...")
        
        # Actually read files and return content for LLM
        results = []
        
        for path in file_paths:
            try:
                content = sandbox.files.read(path)
                results.append({
                    "path": path,
                    "content": content,
                    "length": len(content)
                })
            except Exception as e:
                results.append({
                    "path": path,
                    "error": str(e)
                })
        
        # Return actual file content as JSON for LLM decision making
        return json.dumps(results, indent=2)
    except Exception as e:
        error_msg = f"File reading failed: {e}"
        print(f"😅 Sorry, I had trouble reading your existing files: {e}")
        return error_msg

@tool(args_schema=TaskComplete)
def task_complete(summary: str, files_created: List[str]) -> str:
    """Mark the task as complete with a summary. This will end the agent execution."""
    return f"Perfect! I've completed your request. {summary}"

# ========================
# AGENT NODES
# ========================

# Collect all tools
tools = [terminal, create_or_update_files, read_files, task_complete]
tools_by_name = {tool.name: tool for tool in tools}

def llm_call(state: State):
    """LLM decides what action to take next"""
    llm = ChatOpenAI(
        model=state["model"],
        openai_api_base="https://openrouter.ai/api/v1",
        openai_api_key=OPENROUTER_API_KEY,
        temperature=0.1
    )
    llm_with_tools = llm.bind_tools(tools, tool_choice="any")
    
    # Enhance system prompt based on session type
    system_prompt = SYSTEM_PROMPT
    
    if state["session_type"] == "continuing":
        session_context = f"""

<continuing_session>
<session_type>Continuing existing project (not starting from scratch)</session_type>

<conversation_history>
{state.get("conversation_history", "")}
</conversation_history>

<mandatory_continuing_workflow>
1. **ALWAYS READ FIRST**: read_files(["app/page.tsx"]) to understand existing structure
2. **CHECK FOR PACKAGES**: If new feature needs external packages → terminal("npm install package-name --yes")
3. **PRESERVE EXISTING**: Modify existing files, don't replace unless absolutely necessary
4. **MAINTAIN 'use client'**: Keep existing 'use client' directives and add to new interactive components
5. **BUILD UPON**: Enhance existing functionality, don't start over
</mandatory_continuing_workflow>

<reading_strategy>
- ALWAYS start with app/page.tsx to understand main app structure
- Read relevant component files before modifying them
- Use read_files tool to understand existing code patterns
- Focus on understanding existing functionality before making changes
</reading_strategy>

<session_goals>
- Enhance existing functionality rather than replacing it
- Maintain backward compatibility with existing features
- Build incrementally upon the current codebase
- Preserve existing 'use client' directives and add to new interactive components
</session_goals>
</continuing_session>
"""
        system_prompt += session_context
    
    messages = [{"role": "system", "content": system_prompt}] + state["messages"]
    response = llm_with_tools.invoke(messages)
    
    return {"messages": [response]}

def tool_handler(state: State, stream_callback=None):
    """Execute the tools called by the LLM"""
    
    result_messages = []
    files_created = state.get("files_created", {}).copy()  # Get current files_created
    
    # Get the last message (should contain tool calls)
    last_message = state["messages"][-1]
    
    if not last_message.tool_calls:
        return {"messages": []}
    
    # Execute each tool call
    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"].copy()  # Make a copy to avoid mutation issues
        tool_id = tool_call["id"]
        
        try:
            # Get the tool
            tool = tools_by_name[tool_name]
            
            # Create minimal RunnableConfig to avoid parent_run_id issues
            config = RunnableConfig(
                configurable={"sandbox": state["sandbox"]},
                run_name=f"tool_{tool_name}",
                tags=[f"tool:{tool_name}"]
            )
            
            # Use proper tool.invoke() with config for all tools
            observation = tool.invoke(tool_args, config=config)
            
            # Track file creation for create_or_update_files tool
            if tool_name == "create_or_update_files":
                try:
                    # Extract file paths from the tool arguments
                    files_data = tool_args.get("files", [])
                    
                    for file_data in files_data:
                        file_path = file_data.get("path")
                        file_content = file_data.get("content", "")
                        if file_path:
                            # Store file path and actual file content
                            files_created[file_path] = file_content
                            if stream_callback:
                                # Make it more user-friendly and natural
                                if "app/page.tsx" in file_path:
                                    stream_callback(f"✨ Setting up the main page of your app...")
                                elif "components/" in file_path:
                                    component_name = file_path.split("/")[-1].replace(".tsx", "").replace(".jsx", "")
                                    stream_callback(f"🎨 Creating the {component_name} component...")
                                elif "package.json" in file_path:
                                    stream_callback(f"📋 Setting up your project configuration...")
                                elif "README" in file_path:
                                    stream_callback(f"📖 Creating documentation for your project...")
                                elif ".css" in file_path or ".scss" in file_path:
                                    stream_callback(f"🎨 Adding some styling to make it look great...")
                                elif ".js" in file_path or ".ts" in file_path:
                                    stream_callback(f"⚡ Adding some functionality to your app...")
                                else:
                                    stream_callback(f"📄 Creating {file_path}...")
                except Exception as e:
                    if stream_callback:
                        stream_callback(f"😅 Had a small issue while creating files, but continuing...")
            
            # Create tool message
            result_messages.append({
                "role": "tool",
                "content": str(observation),
                "tool_call_id": tool_id
            })
            
        except Exception as e:
            error_msg = f"Sorry, I encountered an issue while working on your app: {e}"
            if stream_callback:
                stream_callback(f"😅 Oops! I ran into a small issue, but I'm continuing...")
            result_messages.append({
                "role": "tool", 
                "content": error_msg,
                "tool_call_id": tool_id
            })
    
    # Return updated state with files_created
    return {
        "messages": result_messages,
        "files_created": files_created
    }

def should_continue(state: State) -> Literal["tool_handler", "__end__"]:
    """Decide whether to continue or end the conversation - following official example pattern"""
    last_message = state["messages"][-1]
    
    # If there are tool calls, check if any is task_complete
    if last_message.tool_calls:
        for tool_call in last_message.tool_calls:
            if tool_call["name"] == "task_complete":
                return END  # End immediately when task_complete is called
        return "tool_handler"  # Continue to tool handler for other tools
    
    # If no tool calls, end the conversation
    return END

# ========================
# GRAPH ASSEMBLY  
# ========================

def create_code_agent(stream_callback=None):
    """Create the LangGraph agent"""
    
    # Create a custom tool handler that uses the stream callback
    def custom_tool_handler(state: State):
        return tool_handler(state, stream_callback)
    
    # Build workflow
    workflow = StateGraph(State)
    
    # Add nodes
    workflow.add_node("llm_call", llm_call)
    workflow.add_node("tool_handler", custom_tool_handler)
    
    # Add edges
    workflow.add_edge(START, "llm_call")
    workflow.add_conditional_edges(
        "llm_call",
        should_continue,
        {
            "tool_handler": "tool_handler",
            END: END,
        },
    )
    workflow.add_edge("tool_handler", "llm_call")
    
    # Compile the agent
    return workflow.compile()

# ========================
# STREAMING SUPPORT
# ========================

import sys
import io
from contextlib import redirect_stdout
from typing import AsyncGenerator

class StreamCapture:
    """Captures print statements and yields them as they occur"""
    
    def __init__(self, stream_callback):
        self.stream_callback = stream_callback
        self.buffer = ""
    
    def write(self, text):
        """Capture print statements and send them to the stream callback"""
        self.buffer += text
        if text.endswith('\n'):
            # Send the complete line
            line = self.buffer.rstrip()
            if line:  # Only send non-empty lines
                self.stream_callback(line)
            self.buffer = ""
    
    def flush(self):
        """Flush any remaining buffer content"""
        if self.buffer:
            self.stream_callback(self.buffer.rstrip())
            self.buffer = ""

async def stream_agent_execution(initial_state: State, stream_callback) -> State:
    """Execute the agent with streaming support"""
    
    # Create agent with stream callback
    agent = create_code_agent(stream_callback)
    
    # Capture print statements from other parts
    with redirect_stdout(StreamCapture(stream_callback)):
        # Run the workflow
        final_state = agent.invoke(initial_state)
        return final_state

# ========================
# EXPORT GLOBAL WORKFLOW
# ========================

# Create global workflow for import by other modules (non-streaming version)
workflow = create_code_agent()

# ========================
# HELPER FUNCTIONS
# ========================

def extract_task_summary(final_state: State) -> str:
    """Extract the task summary from the final state by looking at the last task_complete tool call"""
    messages = final_state.get("messages", [])
    
    # Look backwards through messages to find the last task_complete tool call
    for message in reversed(messages):
        if hasattr(message, 'tool_calls') and message.tool_calls:
            for tool_call in message.tool_calls:
                if tool_call["name"] == "task_complete":
                    # Extract the summary from the tool call arguments
                    args = tool_call.get("args", {})
                    return args.get("summary", "Task completed without summary")
    
    # If no task_complete found, return a default message
    return "Task completed without explicit summary"

def extract_files_created(final_state: State) -> Dict[str, str]:
    """Extract the files created from the final state"""
    return final_state.get("files_created", {})

def get_agent_result_summary(final_state: State) -> Dict[str, Any]:
    """Get a comprehensive summary of the agent's execution results"""
    return {
        "task_summary": extract_task_summary(final_state),
        "files_created": extract_files_created(final_state),
        "total_files": len(final_state.get("files_created", {})),
        "session_type": final_state.get("session_type", "new"),
        "sandbox_id": final_state.get("sandbox_id", ""),
        "sandbox_url": final_state.get("sandbox_url", "")
    }
