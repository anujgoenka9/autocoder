import { NextRequest, NextResponse } from 'next/server';

const AGENT_API_BASE_URL = process.env.AGENT_API_BASE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task, projectId, userId } = body;

    if (!task || !projectId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: task, projectId, userId' },
        { status: 400 }
      );
    }

    // Call the agent API
    const agentResponse = await fetch(`${AGENT_API_BASE_URL}/projects/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        project_id: projectId,
        task: task,
        frontend_context: {
          timestamp: new Date().toISOString(),
          user_agent: request.headers.get('user-agent'),
        }
      }),
    });

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text();
      console.error('Agent API error:', errorText);
      return NextResponse.json(
        { error: `Agent API error: ${agentResponse.status} ${agentResponse.statusText}` },
        { status: agentResponse.status }
      );
    }

    const agentResult = await agentResponse.json();

    return NextResponse.json({
      success: true,
      data: agentResult,
    });

  } catch (error) {
    console.error('Error calling agent API:', error);
    return NextResponse.json(
      { error: 'Failed to communicate with agent API' },
      { status: 500 }
    );
  }
} 