import { NextRequest, NextResponse } from 'next/server';
import { createSSEManager, setController, removeController, getController } from '@/lib/redis';
import { v4 as uuidv4 } from 'uuid';

// SSE manager (Redis or fallback)
const sseManager = createSSEManager();

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
    async start(controller: ReadableStreamDefaultController) {
      const connectionId = uuidv4();
      
      // Store controller in memory for this instance
      setController(projectId, connectionId, controller);
      
      // Register connection in Redis
      await sseManager.addConnection(projectId, connectionId, controller);

      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify({ type: 'connected', projectId })}\n\n`)
      );

      request.signal.addEventListener('abort', async () => {
        // Remove from memory
        removeController(projectId, connectionId);
        
        // Remove from Redis
        await sseManager.removeConnection(projectId, connectionId);
      });
    },
  });

  return new Response(stream, { headers });
}

 