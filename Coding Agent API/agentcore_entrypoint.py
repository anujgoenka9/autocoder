#!/usr/bin/env python3
"""
AgentCore Runtime entrypoint for the Multi-Session Code Generation Agent.

This wraps the existing agent (which uses OpenRouter for the LLM and E2B for the
sandbox) with Amazon Bedrock AgentCore Runtime. It keeps your current logic and
models untouched and simply exposes a runtime-compatible entrypoint.

Run locally for testing:
  python agentcore_entrypoint.py

Expected payload (JSON):
{
  "user_id": "alice_123",
  "project_id": "todo_app_v1",
  "task": "Create a simple React todo app with add/delete functionality",
  "conversation_history": "...",      # optional
  "model": "google/gemini-2.5-flash"  # optional
}
"""

import json
from typing import Any, Dict

from langchain_core.messages import HumanMessage
from bedrock_agentcore.runtime import BedrockAgentCoreApp

from utils.agent import (
    State,
    workflow,
    ProjectSession,
    get_agent_result_summary,
)


app = BedrockAgentCoreApp()


def _validate_payload(payload: Dict[str, Any]) -> None:
    required = ["user_id", "project_id", "task"]
    missing = [k for k in required if k not in payload or payload[k] in (None, "")]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")


@app.entrypoint
def invoke(payload: Dict[str, Any]):
    """
    AgentCore entrypoint. Receives a payload dict and returns a JSON string
    summarizing the result. Keeps OpenRouter as the LLM provider.
    """
    _validate_payload(payload)

    user_id: str = payload["user_id"]
    project_id: str = payload["project_id"]
    task: str = payload["task"]
    conversation_history: str = payload.get("conversation_history", "")
    model: str = payload.get("model", "google/gemini-2.5-flash")

    # Reuse existing session discovery/creation
    sandbox = ProjectSession.find_existing_sandbox(user_id, project_id)
    if sandbox:
        session_type = "continuing"
    else:
        sandbox, _ = ProjectSession.create_new_sandbox(user_id, project_id)
        session_type = "new"

    # Build the agent state compatible with the existing workflow
    initial_state = State(
        messages=[HumanMessage(content=task)],
        sandbox=sandbox,
        sandbox_id=sandbox.sandbox_id,
        sandbox_url=f"https://{sandbox.get_host(3000)}",
        files_created={},
        session_type=session_type,
        conversation_history=conversation_history,
        user_id=user_id,
        project_id=project_id,
        model=model,
    )

    # Invoke the existing compiled workflow (non-streaming)
    final_state = workflow.invoke(initial_state)

    # Summarize using existing helpers; return as JSON string
    summary = get_agent_result_summary(final_state)
    return json.dumps(summary)


if __name__ == "__main__":
    # Local/dev server on port 8000 with path compatibility for FastAPI-style routes
    # Exposes both /invocations and /api/agent, plus /ping
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    import uvicorn

    server = FastAPI()

    @server.get("/ping")
    def ping():
        return {"status": "ok"}

    def _invoke_and_normalize(payload: Dict[str, Any]):
        result = invoke(payload)
        # invoke returns a JSON string; convert to JSON for FastAPI
        if isinstance(result, str):
            return JSONResponse(content=json.loads(result))
        return JSONResponse(content=result)

    @server.post("/invocations")
    def invocations(payload: Dict[str, Any]):
        return _invoke_and_normalize(payload)

    @server.post("/api/agent")
    def api_agent(payload: Dict[str, Any]):
        return _invoke_and_normalize(payload)

    uvicorn.run(server, host="0.0.0.0", port=8000)