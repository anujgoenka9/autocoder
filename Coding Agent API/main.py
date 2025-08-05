#!/usr/bin/env python3
"""
Vercel Function for Multi-Session Code Generation Agent
Provides REST endpoints for project management and code generation
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, AsyncGenerator
import asyncio
import json
from datetime import datetime
from langchain_core.messages import HumanMessage

from utils.agent import (
    State, 
    workflow,
    ProjectSession,
    get_agent_result_summary,
    stream_agent_execution
)

# ========================
# PYDANTIC MODELS
# ========================

class ProjectRequest(BaseModel):
    user_id: str
    project_id: str
    task: str
    # Optional: Frontend can pass conversation history
    conversation_history: Optional[str] = None
    # Optional: Model to use (defaults to google/gemini-2.5-flash)
    model: Optional[str] = "google/gemini-2.5-flash"

class ProjectResponse(BaseModel):
    success: bool
    project_id: Optional[str] = None
    sandbox_url: Optional[str] = None
    message: str
    error: Optional[str] = None
    # Additional metadata for frontend
    execution_time: Optional[float] = None
    files_created: Optional[Dict[str, str]] = None  # File path -> file content
    task_summary: Optional[str] = None

class StreamResponse(BaseModel):
    type: str  # "status", "output", "error", "complete"
    data: Dict[str, Any]
    timestamp: str

# ========================
# FASTAPI APP
# ========================

app = FastAPI(
    title="Multi-Session Code Generation Agent",
    description="REST API for persistent project development with E2B sandbox",
    version="1.0.0"
)

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        #"http://localhost:3000",  # Next.js dev server
        "https://www.autocodingai.space",  # Production domain
        "https://autocodingai.space"  # Production domain without www
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================
# API ENDPOINTS
# ========================

@app.get("/api/agent")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "service": "multi-session-agent", 
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "health": "GET /api/agent",
            "project": "POST /api/agent"
        }
    }

@app.post("/api/agent")
async def handle_project(request: ProjectRequest):
    """Handle both new and continuing projects with real-time streaming"""
    return await stream_project_execution(request)

async def stream_project_execution(request: ProjectRequest):
    """Stream project execution in real-time"""
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            # Determine if this is a new or continuing project
            sandbox = ProjectSession.find_existing_sandbox(request.user_id, request.project_id)
            
            if sandbox:
                # Continuing existing project
                yield f"data: {json.dumps(StreamResponse(type='status', data={'message': f'🎯 Great! I found your existing project. Let me add the new features you requested...'}, timestamp=datetime.now().isoformat()).dict())}\n\n"
                session_type = "continuing"
                conversation_history = request.conversation_history or ""
            else:
                # Creating new project
                yield f"data: {json.dumps(StreamResponse(type='status', data={'message': f'✨ Perfect! I\'m creating a brand new project for you...'}, timestamp=datetime.now().isoformat()).dict())}\n\n"
                sandbox, project_id = ProjectSession.create_new_sandbox(request.user_id, request.project_id)
                session_type = "new"
                conversation_history = ""
            
            yield f"data: {json.dumps(StreamResponse(type='status', data={'message': '⚙️ Setting up the development environment...'}, timestamp=datetime.now().isoformat()).dict())}\n\n"
            
            # Initialize state
            initial_state = State(
                messages=[HumanMessage(content=request.task)],
                sandbox=sandbox,
                sandbox_id=sandbox.sandbox_id,
                sandbox_url=f"https://{sandbox.get_host(3000)}",
                files_created={},
                session_type=session_type,
                conversation_history=conversation_history,
                user_id=request.user_id,
                project_id=request.project_id,
                model=request.model
            )
            
            yield f"data: {json.dumps(StreamResponse(type='status', data={'message': '🎨 Now I\'ll start building your app...'}, timestamp=datetime.now().isoformat()).dict())}\n\n"
            
            # Create a list to collect messages
            stream_messages = []
            
            # Define stream callback to collect messages
            def stream_callback(message: str):
                """Callback to collect messages for streaming"""
                stream_messages.append(message)
            
            # Run the streaming agent
            final_state = await stream_agent_execution(initial_state, stream_callback)
            
            # Stream all collected messages
            for message in stream_messages:
                yield f"data: {json.dumps(StreamResponse(type='output', data={'message': message}, timestamp=datetime.now().isoformat()).dict())}\n\n"
            
            # Extract results using new helper function
            summary = get_agent_result_summary(final_state)
            
            # Send completion with user-friendly message
            yield f"data: {json.dumps(StreamResponse(type='complete', data={
                'sandbox_url': final_state['sandbox_url'],
                'files_created': final_state['files_created'],  # Include both file paths and content
                'task_summary': summary['task_summary']
            }, timestamp=datetime.now().isoformat()).dict())}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps(StreamResponse(type='error', data={'message': f'😅 Sorry, I encountered an issue while building your app: {str(e)}'}, timestamp=datetime.now().isoformat()).dict())}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream"
        }
    )

# ========================
# USAGE EXAMPLES
# ========================

"""
Example usage of the user-friendly API:

HEALTH CHECK:
GET /api/agent
Response: {"status": "healthy", "service": "multi-session-agent", ...}

BUILD YOUR APP:
POST /api/agent
{
    "user_id": "alice_123",
    "project_id": "todo_app_v1",
    "task": "Create a simple React todo app with add/delete functionality"
}

Examples:

1. Create a new app:
POST /api/agent
{
    "user_id": "alice_123",
    "project_id": "todo_app_v1",
    "task": "Create a simple React todo app with add/delete functionality"
}

2. Create an app with a specific AI model:
POST /api/agent
{
    "user_id": "alice_123",
    "project_id": "todo_app_v1",
    "task": "Create a simple React todo app with add/delete functionality",
    "model": "anthropic/claude-3.5-sonnet"
}

3. Add features to an existing app:
POST /api/agent
{
    "user_id": "alice_123", 
    "project_id": "todo_app_v1",
    "task": "Add a search feature to filter todos",
    "conversation_history": "Created a basic todo app with add/delete functionality"
}

4. Create a different type of app:
POST /api/agent
{
    "user_id": "bob_456",
    "project_id": "weather_app_v1", 
    "task": "Create a weather app that shows current conditions",
    "model": "google/gemini-1.5-pro"
}

The API automatically detects whether to create a new app or continue working on an existing one
based on whether a project exists for the user_id + project_id combination.

All requests provide real-time streaming updates including:
- Status messages about app building progress
- Real-time updates as the AI builds your app
- Final completion with your app ready to use
""" 