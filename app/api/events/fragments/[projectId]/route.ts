import { NextRequest, NextResponse } from 'next/server';

// In-memory store for active connections (in production, use Redis or similar)
const connections = new Map<string, ReadableStreamDefaultController[]>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
  }

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  };

  const stream = new ReadableStream({
    start(controller) {
      if (!connections.has(projectId)) {
        connections.set(projectId, []);
      }
      connections.get(projectId)!.push(controller);

      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify({ type: 'connected', projectId })}\n\n`)
      );

      request.signal.addEventListener('abort', () => {
        const projectConnections = connections.get(projectId);
        if (projectConnections) {
          const index = projectConnections.indexOf(controller);
          if (index > -1) {
            projectConnections.splice(index, 1);
          }
          if (projectConnections.length === 0) {
            connections.delete(projectId);
          }
        }
      });
    },
  });

  return new Response(stream, { headers });
}

export function broadcastFragmentUpdate(projectId: string, data: any) {
  const projectConnections = connections.get(projectId);
  
  if (projectConnections) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    
    projectConnections.forEach((controller) => {
      try {
        controller.enqueue(encoder.encode(message));
      } catch (error) {
        console.error('Failed to send SSE message:', error);
      }
    });
  }
} 