import { createSSEManager, setController, removeController, getController } from '@/lib/redis';

// SSE manager (Redis or fallback)
const sseManager = createSSEManager();

export async function broadcastFragmentUpdate(projectId: string, data: any) {
  try {
    // Optimization 3: Only broadcast if there are active connections
    const connectionIds = await sseManager.getConnectionIds(projectId);
    
    if (connectionIds.length === 0) {
      return; // Skip broadcasting if no active connections
    }
    
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
  } catch (error) {
    console.error('Failed to broadcast fragment update:', error);
  }
}

// Deployment-scale optimization: Connection health check
export async function getConnectionHealth(projectId: string) {
  try {
    const connectionIds = await sseManager.getConnectionIds(projectId);
    const activeConnections = connectionIds.filter(id => getController(projectId, id));
    
    return {
      totalConnections: connectionIds.length,
      activeConnections: activeConnections.length,
      health: activeConnections.length > 0 ? 'healthy' : 'no_connections'
    };
  } catch (error) {
    console.error('Failed to get connection health:', error);
    return { totalConnections: 0, activeConnections: 0, health: 'error' };
  }
}

// Deployment-scale optimization: Cleanup stale connections
export async function cleanupStaleConnections() {
  try {
    await sseManager.cleanupExpiredConnections();
  } catch (error) {
    console.error('Failed to cleanup stale connections:', error);
  }
} 