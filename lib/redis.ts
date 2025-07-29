import { Redis } from 'ioredis';

// Redis client for SSE connections
let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!redis) {
    try {
      redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 3,
        lazyConnect: true, // Don't connect immediately
      });

      redis.on('error', (error) => {
        console.error('Redis connection error:', error);
        redis = null; // Reset on error
      });

      redis.on('connect', () => {
        console.log('Connected to Redis');
      });

      // Test connection
      redis.ping().catch(() => {
        console.warn('Redis not available, falling back to in-memory storage');
        redis = null;
      });
    } catch (error) {
      console.warn('Failed to initialize Redis, falling back to in-memory storage:', error);
      redis = null;
    }
  }

  return redis;
}

// SSE Connection Management with Redis
export class SSEManager {
  private redis: Redis;
  private readonly prefix = 'sse:connections:';
  private readonly expiry = 3600; // 1 hour

  constructor() {
    const redisClient = getRedisClient();
    if (!redisClient) {
      throw new Error('Redis client not available');
    }
    this.redis = redisClient;
  }

  // Add a connection for a project
  async addConnection(projectId: string, connectionId: string, controller: any): Promise<void> {
    const key = `${this.prefix}${projectId}`;
    const connectionData = {
      id: connectionId,
      timestamp: Date.now(),
      // Note: We can't serialize the controller, so we'll store metadata
      // The actual controller will be kept in memory per instance
    };

    await this.redis.hset(key, connectionId, JSON.stringify(connectionData));
    await this.redis.expire(key, this.expiry);
  }

  // Remove a connection for a project
  async removeConnection(projectId: string, connectionId: string): Promise<void> {
    const key = `${this.prefix}${projectId}`;
    await this.redis.hdel(key, connectionId);
    
    // If no more connections for this project, remove the key
    const remainingConnections = await this.redis.hlen(key);
    if (remainingConnections === 0) {
      await this.redis.del(key);
    }
  }

  // Get all connection IDs for a project
  async getConnectionIds(projectId: string): Promise<string[]> {
    const key = `${this.prefix}${projectId}`;
    const connections = await this.redis.hgetall(key);
    return Object.keys(connections);
  }

  // Get connection count for a project
  async getConnectionCount(projectId: string): Promise<number> {
    const key = `${this.prefix}${projectId}`;
    return await this.redis.hlen(key);
  }

  // Clean up expired connections
  async cleanupExpiredConnections(): Promise<void> {
    // This would be called periodically to clean up stale connections
    const keys = await this.redis.keys(`${this.prefix}*`);
    
    for (const key of keys) {
      const connections = await this.redis.hgetall(key);
      const now = Date.now();
      
      for (const [connectionId, dataStr] of Object.entries(connections)) {
        try {
          const data = JSON.parse(dataStr);
          if (now - data.timestamp > this.expiry * 1000) {
            await this.redis.hdel(key, connectionId);
          }
        } catch (error) {
          // Remove invalid data
          await this.redis.hdel(key, connectionId);
        }
      }
    }
  }
}

// In-memory store for controllers (per server instance)
const controllers = new Map<string, Map<string, any>>();

export function getController(projectId: string, connectionId: string): any {
  return controllers.get(projectId)?.get(connectionId);
}

export function setController(projectId: string, connectionId: string, controller: any): void {
  if (!controllers.has(projectId)) {
    controllers.set(projectId, new Map());
  }
  controllers.get(projectId)!.set(connectionId, controller);
}

export function removeController(projectId: string, connectionId: string): void {
  const projectControllers = controllers.get(projectId);
  if (projectControllers) {
    projectControllers.delete(connectionId);
    if (projectControllers.size === 0) {
      controllers.delete(projectId);
    }
  }
}

// Fallback SSE Manager for when Redis is not available
export class FallbackSSEManager {
  private connections = new Map<string, Map<string, any>>();

  async addConnection(projectId: string, connectionId: string, controller: any): Promise<void> {
    if (!this.connections.has(projectId)) {
      this.connections.set(projectId, new Map());
    }
    this.connections.get(projectId)!.set(connectionId, controller);
  }

  async removeConnection(projectId: string, connectionId: string): Promise<void> {
    const projectConnections = this.connections.get(projectId);
    if (projectConnections) {
      projectConnections.delete(connectionId);
      if (projectConnections.size === 0) {
        this.connections.delete(projectId);
      }
    }
  }

  async getConnectionIds(projectId: string): Promise<string[]> {
    const projectConnections = this.connections.get(projectId);
    return projectConnections ? Array.from(projectConnections.keys()) : [];
  }

  async getConnectionCount(projectId: string): Promise<number> {
    const projectConnections = this.connections.get(projectId);
    return projectConnections ? projectConnections.size : 0;
  }

  async cleanupExpiredConnections(): Promise<void> {
    // No cleanup needed for in-memory storage
  }
}

// Factory function to create the appropriate SSE manager
export function createSSEManager(): SSEManager | FallbackSSEManager {
  try {
    return new SSEManager();
  } catch (error) {
    console.warn('Using fallback in-memory SSE manager (Redis not available)');
    return new FallbackSSEManager();
  }
} 