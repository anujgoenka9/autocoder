#!/usr/bin/env python3
"""
FastAPI Server for Multi-Session Code Generation Agent
Provides REST endpoints for project management and code generation
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, AsyncGenerator
import uvicorn
import asyncio
import json
from datetime import datetime
from langchain_core.messages import HumanMessage

from langgraph_code_agent import (
    State, 
    workflow,
    ProjectSession
)

# ========================
# PYDANTIC MODELS
# ========================

class NewProjectRequest(BaseModel):
    user_id: str
    project_name: str
    task: str
    # Optional: Frontend can pass additional context
    frontend_context: Optional[Dict[str, Any]] = None

class ContinueProjectRequest(BaseModel):
    user_id: str
    project_id: str
    task: str
    # Optional: Frontend can pass conversation history
    conversation_history: Optional[str] = None
    # Optional: Frontend can pass additional context
    frontend_context: Optional[Dict[str, Any]] = None

class ProjectResponse(BaseModel):
    success: bool
    project_id: Optional[str] = None
    sandbox_url: Optional[str] = None
    message: str
    error: Optional[str] = None
    # Additional metadata for frontend
    execution_time: Optional[float] = None
    files_created: Optional[List[str]] = None

class StreamResponse(BaseModel):
    type: str  # "status", "output", "error", "complete"
    data: Dict[str, Any]
    timestamp: str

# ========================
# HELPER FUNCTIONS
# ========================

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
        "http://localhost:3000",  # Next.js dev server
        "http://localhost:3001",  # Alternative port
        "https://yourdomain.com",  # Production domain
        "*"  # For development - remove in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================
# HELPER FUNCTIONS
# ========================

# ========================
# API ENDPOINTS
# ========================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Multi-Session Code Generation Agent API",
        "version": "1.0.0",
        "endpoints": {
            "new_project": "POST /projects/new",
            "continue_project": "POST /projects/continue", 
            "stream_project": "POST /projects/stream",
            "health": "GET /"
        }
    }

@app.post("/projects/new", response_model=ProjectResponse)
async def create_new_project(request: NewProjectRequest, background_tasks: BackgroundTasks):
    """Start a new project"""
    start_time = datetime.now()
    
    try:
        print(f"🚀 API: Starting new project '{request.project_name}' for user {request.user_id}")
        
        # Create new sandbox with metadata
        sandbox, project_id = ProjectSession.create_new_sandbox(request.user_id, request.project_name)
        
        # Initialize state for new project
        initial_state = State(
            messages=[HumanMessage(content=request.task)],
            sandbox=sandbox,
            sandbox_id=sandbox.sandbox_id,
            sandbox_url=f"https://{sandbox.get_host(3000)}",
            files_created={},
            task_complete=False,
            session_type="new",
            conversation_history="",
            user_id=request.user_id,
            project_id=project_id
        )
        
        print(f"🎯 Task: {request.task}")
        
        # Run the agent workflow
        final_state = workflow.invoke(initial_state)
        
        # Calculate execution time
        execution_time = (datetime.now() - start_time).total_seconds()
        
        print(f"✅ Project '{request.project_name}' created successfully!")
        print(f"📁 Files created: {list(final_state['files_created'].keys())}")
        
        return ProjectResponse(
            success=True,
            project_id=project_id,
            sandbox_url=final_state['sandbox_url'],
            message=f"Project '{request.project_name}' created successfully",
            execution_time=execution_time,
            files_created=list(final_state['files_created'].keys())
        )
        
    except Exception as e:
        print(f"❌ Error creating project: {e}")
        return ProjectResponse(
            success=False,
            message="Failed to create project",
            error=str(e)
        )

@app.post("/projects/continue", response_model=ProjectResponse)
async def continue_existing_project(request: ContinueProjectRequest):
    """Continue working on an existing project"""
    start_time = datetime.now()
    
    try:
        print(f"🔄 API: Continuing project {request.project_id} for user {request.user_id}")
        
        # Find existing sandbox
        sandbox = ProjectSession.find_existing_sandbox(request.user_id, request.project_id)
        if not sandbox:
            raise HTTPException(
                status_code=404, 
                detail=f"Project {request.project_id} not found for user {request.user_id}"
            )
        
        # Use provided conversation history or empty string
        conversation_history = request.conversation_history or ""
        
        # Initialize state for continuing project
        initial_state = State(
            messages=[HumanMessage(content=request.task)],
            sandbox=sandbox,
            sandbox_id=sandbox.sandbox_id,
            sandbox_url=f"https://{sandbox.get_host(3000)}",
            files_created={},  # Will be discovered by the agent
            task_complete=False,
            session_type="continuing",
            conversation_history=conversation_history,
            user_id=request.user_id,
            project_id=request.project_id
        )
        
        print(f"🎯 New task: {request.task}")
        
        # Run the agent workflow
        final_state = workflow.invoke(initial_state)
        
        # Calculate execution time
        execution_time = (datetime.now() - start_time).total_seconds()
        
        print(f"✅ Project '{request.project_id}' updated successfully!")
        print(f"📁 Files created/modified: {list(final_state['files_created'].keys())}")
        
        return ProjectResponse(
            success=True,
            project_id=request.project_id,
            sandbox_url=final_state['sandbox_url'],
            message=f"Project {request.project_id} updated successfully",
            execution_time=execution_time,
            files_created=list(final_state['files_created'].keys())
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error continuing project: {e}")
        return ProjectResponse(
            success=False,
            message="Failed to continue project",
            error=str(e)
        )



@app.post("/projects/stream")
async def stream_project_execution(request: ContinueProjectRequest):
    """Stream project execution in real-time (for frontend progress updates)"""
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            # Send initial status
            yield f"data: {json.dumps(StreamResponse(type='status', data={'message': 'Starting project execution...'}, timestamp=datetime.now().isoformat()).dict())}\n\n"
            
            # Find existing sandbox
            sandbox = ProjectSession.find_existing_sandbox(request.user_id, request.project_id)
            if not sandbox:
                yield f"data: {json.dumps(StreamResponse(type='error', data={'message': f'Project {request.project_id} not found'}, timestamp=datetime.now().isoformat()).dict())}\n\n"
                return
            
            # Use provided conversation history or empty string
            conversation_history = request.conversation_history or ""
            
            yield f"data: {json.dumps(StreamResponse(type='status', data={'message': 'Retrieved conversation history'}, timestamp=datetime.now().isoformat()).dict())}\n\n"
            
            # Initialize state
            initial_state = State(
                messages=[HumanMessage(content=request.task)],
                sandbox=sandbox,
                sandbox_id=sandbox.sandbox_id,
                sandbox_url=f"https://{sandbox.get_host(3000)}",
                files_created={},
                task_complete=False,
                session_type="continuing",
                conversation_history=conversation_history,
                user_id=request.user_id,
                project_id=request.project_id
            )
            
            yield f"data: {json.dumps(StreamResponse(type='status', data={'message': 'Initialized project state'}, timestamp=datetime.now().isoformat()).dict())}\n\n"
            
            # Run workflow (this would need to be modified to support streaming)
            final_state = workflow.invoke(initial_state)
            
            # Send completion
            yield f"data: {json.dumps(StreamResponse(type='complete', data={
                'sandbox_url': final_state['sandbox_url'],
                'files_created': list(final_state['files_created'].keys()),
                'message': 'Project execution completed successfully'
            }, timestamp=datetime.now().isoformat()).dict())}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps(StreamResponse(type='error', data={'message': str(e)}, timestamp=datetime.now().isoformat()).dict())}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream"
        }
    )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "multi-session-agent", "timestamp": datetime.now().isoformat()}

# ========================
# MAIN EXECUTION
# ========================

if __name__ == "__main__":
    print("🚀 Starting Multi-Session Code Generation Agent API Server")
    print("=" * 60)
    print("📖 Available endpoints:")
    print("  POST /projects/new - Create a new project")
    print("  POST /projects/continue - Continue existing project")
    print("  POST /projects/stream - Stream project execution")
    print("  GET  / - API info")
    print("  GET  /health - Health check")
    print("=" * 60)
    
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 