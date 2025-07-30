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
from prompt import SYSTEM_PROMPT

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
        
        print(f"🚀 Created new sandbox for project (ID: {project_id})")
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
                print(f"🔄 Reconnected to existing project (ID: {project_id})")
                return sandbox
            else:
                print(f"❌ No existing sandbox found for project ID: {project_id}")
                return None
                
        except Exception as e:
            print(f"❌ Error finding sandbox: {e}")
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
    task_complete: bool
    task_summary: str = ""  # Summary of what was accomplished
    # Session management fields
    session_type: str = "new"  # "new" or "continuing"
    conversation_history: str = ""  # Previous conversation summary
    user_id: str = ""  # User identifier
    project_id: str = ""  # Project identifier

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

# ========================
# TOOL DEFINITIONS
# ========================

@tool(args_schema=TerminalInput)
def terminal(command: str, config: RunnableConfig) -> str:
    """Use the terminal to run commands in the sandbox."""
    try:
        sandbox = config["configurable"]["sandbox"]
        print(f"🔧 Running terminal command: {command}")
        result = sandbox.commands.run(command)
        output = result.stdout if result.stdout else ""
        if result.stderr:
            output += f"\nSTDERR: {result.stderr}"
        print(f"✅ Command output: {output[:200]}...")
        return output
    except Exception as e:
        error_msg = f"Command failed: {e}"
        print(f"❌ {error_msg}")
        return error_msg

@tool(args_schema=CreateFilesInput)
def create_or_update_files(files: List[FileToCreate], config: RunnableConfig) -> str:
    """Create or update files in the sandbox."""
    try:
        sandbox = config["configurable"]["sandbox"]
        print(f"🔍 Creating {len(files)} files")
        results = []
        
        for i, file in enumerate(files):
            print(f"📝 Writing file {i+1}/{len(files)}: {file.path}")
            sandbox.files.write(file.path, file.content)
            
            # Verify the file was written
            try:
                written_content = sandbox.files.read(file.path)
                results.append(f"✅ Successfully wrote {file.path} ({len(written_content)} characters)")
            except Exception as verify_error:
                results.append(f"⚠️ File {file.path} may not have been written correctly: {verify_error}")
        
        return "\n".join(results)
    except Exception as e:
        error_msg = f"File creation failed: {e}"
        print(f"❌ {error_msg}")
        return error_msg

@tool(args_schema=ReadFilesInput)  
def read_files(file_paths: List[str], config: RunnableConfig) -> str:
    """Read files from the sandbox."""
    try:
        sandbox = config["configurable"]["sandbox"]
        print(f"🔍 Reading {len(file_paths)} files")
        results = []
        
        for path in file_paths:
            print(f"📖 Reading file: {path}")
            try:
                content = sandbox.files.read(path)
                results.append({
                    "path": path,
                    "content": content,
                    "length": len(content)
                })
                print(f"✅ Successfully read {path} ({len(content)} characters)")
            except Exception as e:
                error_msg = f"Failed to read {path}: {e}"
                print(f"❌ {error_msg}")
                results.append({
                    "path": path,
                    "error": str(e)
                })
        
        return json.dumps(results, indent=2)
    except Exception as e:
        error_msg = f"File reading failed: {e}"
        print(f"❌ {error_msg}")
        return error_msg

@tool
def task_complete(summary: str, files_created: List[str], completed: bool = True) -> str:
    """Mark the task as complete with a summary."""
    print(f"🎯 TaskComplete called with summary: {summary}")
    print(f"📁 Files created: {files_created}")
    print(f"✅ Completed: {completed}")
    return f"Task completed successfully. Summary: {summary}"

# ========================
# AGENT NODES
# ========================

# Collect all tools
tools = [terminal, create_or_update_files, read_files, task_complete]
tools_by_name = {tool.name: tool for tool in tools}

def llm_call(state: State):
    """LLM decides what action to take next"""
    llm = ChatOpenAI(
        model="google/gemini-2.5-flash",
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

def tool_handler(state: State):
    """Execute the tools called by the LLM"""
    
    result_messages = []
    files_created = state.get("files_created", {}).copy()  # Get current files_created
    task_summary = state.get("task_summary", "")  # Get current task summary
    task_complete = state.get("task_complete", False)  # Get current task complete status
    
    # Get the last message (should contain tool calls)
    last_message = state["messages"][-1]
    
    if not last_message.tool_calls:
        return {"messages": []}
    
    # Execute each tool call
    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"].copy()  # Make a copy to avoid mutation issues
        tool_id = tool_call["id"]
        
        print(f"🔧 Executing tool: {tool_name}")
        
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
                    print(f"📝 Processing {len(files_data)} files for tracking")
                    for file_data in files_data:
                        file_path = file_data.get("path")
                        file_content = file_data.get("content", "")
                        if file_path:
                            # Store file path and actual file content
                            files_created[file_path] = file_content
                            print(f"📝 Tracked file creation: {file_path} ({len(file_content)} characters)")
                    print(f"📊 Total files tracked: {len(files_created)}")
                except Exception as e:
                    print(f"⚠️ Warning: Could not track file creation: {e}")
            
            # Handle task_complete tool
            elif tool_name == "task_complete":
                try:
                    # Update task_complete status and capture summary
                    task_complete = tool_args.get("completed", True)
                    task_summary = tool_args.get("summary", "")
                    print(f"✅ Task marked as complete: {task_complete}")
                    print(f"📝 Task summary: {task_summary}")
                except Exception as e:
                    print(f"⚠️ Warning: Could not update task completion status: {e}")
            
            # Create tool message
            print(f"✅ Tool execution successful")
            result_messages.append({
                "role": "tool",
                "content": str(observation),
                "tool_call_id": tool_id
            })
            
        except Exception as e:
            error_msg = f"Tool execution failed: {e}"
            print(f"❌ {error_msg}")
            result_messages.append({
                "role": "tool", 
                "content": error_msg,
                "tool_call_id": tool_id
            })
    
    # Return updated state with files_created, task_complete, and task_summary
    return {
        "messages": result_messages,
        "files_created": files_created,
        "task_complete": task_complete,
        "task_summary": task_summary
    }



def should_continue(state: State) -> Literal["tool_handler", "__end__"]:
    """Decide whether to continue or end the conversation"""
    last_message = state["messages"][-1]
    
    # If task is already complete, end the conversation
    if state.get("task_complete", False):
        return END
    
    # If there are tool calls, go to tool_handler
    if last_message.tool_calls:
        return "tool_handler"
    
    # If no tool calls, end the conversation
    return END

# ========================
# GRAPH ASSEMBLY  
# ========================

def create_code_agent():
    """Create the LangGraph agent"""
    
    # Build workflow
    workflow = StateGraph(State)
    
    # Add nodes
    workflow.add_node("llm_call", llm_call)
    workflow.add_node("tool_handler", tool_handler)
    
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
# MAIN EXECUTION FUNCTION
# ========================

def run_code_generation_task(prompt: str, user_id: str = "standalone_user", project_id: str = "standalone_project", session_type: str = "new", conversation_history: str = ""):
    """
    Create a sandbox and run the code generation task
    
    Args:
        prompt: The task description
        user_id: User identifier (default: "standalone_user")
        project_id: Project identifier (default: "standalone_project")
        session_type: Session type - "new" or "continuing" (default: "new")
        conversation_history: Previous conversation summary (default: "")
    """
    print("🚀 Starting Code Generation Task")
    print("=" * 50)
    
    # Check API keys
    if not OPENROUTER_API_KEY:
        print("❌ OPENROUTER_API_KEY not found in .env file")
        return None
        
    if not os.getenv("E2B_API_KEY"):
        print("❌ E2B_API_KEY not found in .env file")
        return None
        
    print("✅ API keys found")
    
    # 1. Create or find E2B Sandbox using ProjectSession
    print(f"🏗️ {'Creating new' if session_type == 'new' else 'Finding existing'} sandbox...")
    try:
        if session_type == "new":
            # Create new sandbox with metadata
            sandbox, _ = ProjectSession.create_new_sandbox(user_id, project_id)
            print(f"✅ New sandbox created: {sandbox.sandbox_id}")
        else:
            # Find existing sandbox
            sandbox = ProjectSession.find_existing_sandbox(user_id, project_id)
            if not sandbox:
                print(f"❌ No existing sandbox found for project {project_id}")
                return None
            print(f"✅ Found existing sandbox: {sandbox.sandbox_id}")
        
        # Get sandbox URL
        host = sandbox.get_host(3000)
        sandbox_url = f"https://{host}"
        print(f"🌐 Sandbox URL: {sandbox_url}")
        
    except Exception as e:
        print(f"❌ Failed to {'create' if session_type == 'new' else 'find'} sandbox: {e}")
        return None
    
    # 2. Create the agent
    agent = create_code_agent()
    
    # 3. Initial state
    initial_state = {
        "messages": [
            {
                "role": "user", 
                "content": f"Please help me build: {prompt}"
            }
        ],
        "sandbox": sandbox,
        "sandbox_id": sandbox.sandbox_id,
        "sandbox_url": sandbox_url,
        "files_created": {},
        "task_complete": False,
        # Session management fields
        "session_type": session_type,
        "conversation_history": conversation_history,
        "user_id": user_id,
        "project_id": project_id
    }
    
    print(f"🎯 Task: {prompt}")
    print()
    
    try:
        # 4. Run the agent
        result = agent.invoke(initial_state)
        
        print("\n" + "=" * 50)
        print("🎯 TASK COMPLETED!")
        print("=" * 50)
        print(f"🔗 Sandbox URL: {result['sandbox_url']}")
        print(f"🆔 Sandbox ID: {result['sandbox_id']}")
        print(f"📁 Project ID: {result['project_id']}")
        
        return result
        
    except Exception as e:
        print(f"❌ Agent execution failed: {e}")
        return None

# ========================
# EXPORT GLOBAL WORKFLOW
# ========================

# Create global workflow for import by other modules
workflow = create_code_agent()

# ========================
# TEST EXECUTION
# ========================

if __name__ == "__main__":
    # Simple test with external library installation
    prompt = "Create a simple todo app with a nice animation when you add or remove items. Use framer-motion library for smooth animations."
    
    # Example 1: New session (creates new sandbox)
    print("🧪 Example 1: New session - creating new sandbox")
    result = run_code_generation_task(
        prompt=prompt,
        user_id="test_user_123",
        project_id="test_project_123"
    )
    
    if result:
        # Store the project_id for the continuing session
        project_id = result['project_id']
        print(f"📝 Project ID for continuing session: {project_id}")
        
        # Example 2: Continuing session (finds existing sandbox)
        print("\n" + "="*50)
        print("🧪 Example 2: Continuing session - finding existing sandbox")
        conversation_history = f"""
## Previous Conversation
**Task:** {prompt}
**Summary:** Created a todo app with framer-motion animations for adding/removing items
**Files Modified:** {', '.join(result['files_created'].keys()) if result['files_created'] else 'None'}
**Status:** completed
"""
        
        result2 = run_code_generation_task(
            prompt="Add a dark mode toggle button to the existing todo app. Use a sun/moon icon from lucide-react (already installed).",
            user_id="test_user_123",
            project_id=project_id,
            session_type="continuing",
            conversation_history=conversation_history
        )
    else:
        print("❌ First session failed, skipping continuing session test")
    
    if result:
        print("\n🎉 Task completed! Visit the sandbox URL to see your application.")
    else:
        print("\n❌ Task failed.") 