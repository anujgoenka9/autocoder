import { createSSEManager, setController, removeController, getController } from '@/lib/redis';

// SSE manager (Redis or fallback)
const sseManager = createSSEManager();

export async function broadcastFragmentUpdate(projectId: string, data: any) {
  try {
    // Get all connection IDs for this project from Redis
    const connectionIds = await sseManager.getConnectionIds(projectId);
    
    if (connectionIds.length > 0) {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      const encoder = new TextEncoder();
      
      // Send to all connections that exist in this instance
      for (const connectionId of connectionIds) {
        const controller = getController(projectId, connectionId);
        
        if (controller) {
          try {
            controller.enqueue(encoder.encode(message));
          } catch (error) {
            console.error('Failed to send SSE message:', error);
            // Remove failed connection
            removeController(projectId, connectionId);
            await sseManager.removeConnection(projectId, connectionId);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to broadcast fragment update:', error);
  }
} 