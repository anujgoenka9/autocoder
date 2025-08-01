import { Redis } from 'ioredis';

// Redis client for SSE connections
let redis: Redis | null = null;
let connectionAttempts = 0;
const MAX_RECONNECTION_ATTEMPTS = 3;

export function getRedisClient(): Redis | null {
  if (!redis) {
    try {
      // Support both REDIS_URL and individual parameters
      if (process.env.REDIS_URL) {
        redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          lazyConnect: true, // Don't connect immediately
          enableReadyCheck: true,
          // Connection pooling for better performance
          family: 4, // Force IPv4
          keepAlive: 30000,
          // Performance optimizations
          commandTimeout: 5000,
        });
      } else {
        redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0'),
          maxRetriesPerRequest: 3,
          lazyConnect: true, // Don't connect immediately
          enableReadyCheck: true,
          // Connection pooling for better performance
          family: 4, // Force IPv4
          keepAlive: 30000,
          // Performance optimizations
          commandTimeout: 5000,
        });
      }

      redis.on('error', (error) => {
        console.error('Redis connection error:', error);
        connectionAttempts++;
        
        if (connectionAttempts >= MAX_RECONNECTION_ATTEMPTS) {
          console.warn('Max Redis reconnection attempts reached, falling back to in-memory storage');
          redis = null;
        }
      });

      redis.on('connect', () => {
        console.log('Connected to Redis');
        connectionAttempts = 0; // Reset on successful connection
      });

      redis.on('ready', () => {
        console.log('Redis client ready');
      });

      redis.on('close', () => {
        console.log('Redis connection closed');
      });

      redis.on('reconnecting', (delay: number) => {
        console.log(`Redis reconnecting in ${delay}ms (attempt ${connectionAttempts + 1})`);
      });

      // Test connection
      redis.ping().then(() => {
        console.log('✅ Redis ping successful');
      }).catch((error) => {
        console.warn('❌ Redis ping failed, falling back to in-memory storage:', error.message);
        redis = null;
      });
    } catch (error) {
      console.warn('Failed to initialize Redis, falling back to in-memory storage:', error);
      redis = null;
    }
  }

  return redis;
}

// Deployment-scale optimization: Connection health check
export async function checkRedisHealth(): Promise<{
  status: 'healthy' | 'unhealthy' | 'disconnected';
  latency?: number;
  error?: string;
}> {
  const client = getRedisClient();
  if (!client) {
    return { status: 'disconnected', error: 'Redis client not available' };
  }

  try {
    const start = Date.now();
    await client.ping();
    const latency = Date.now() - start;
    
    return {
      status: 'healthy',
      latency
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Deployment-scale optimization: Force Redis reconnection
export async function reconnectRedis(): Promise<boolean> {
  if (redis) {
    try {
      await redis.disconnect();
    } catch (error) {
      console.error('Error disconnecting Redis:', error);
    }
  }
  
  redis = null;
  connectionAttempts = 0;
  
  const newClient = getRedisClient();
  if (newClient) {
    try {
      await newClient.ping();
      return true;
    } catch (error) {
      console.error('Failed to reconnect to Redis:', error);
      return false;
    }
  }
  
  return false;
}

// SSE Connection Management with Redis
export class SSEManager {
  private redis: Redis;
  private readonly prefix = 'sse:connections:';
  private readonly expiry = 3600; // 1 hour
  private readonly batchSize = 100; // For bulk operations

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

  // Deployment-scale optimization: Get all project connection counts
  async getAllProjectConnectionCounts(): Promise<Record<string, number>> {
    const keys = await this.redis.keys(`${this.prefix}*`);
    const counts: Record<string, number> = {};
    
    for (const key of keys) {
      const projectId = key.replace(this.prefix, '');
      counts[projectId] = await this.redis.hlen(key);
    }
    
    return counts;
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

  // Deployment-scale optimization: Batch cleanup for better performance
  async batchCleanupExpiredConnections(): Promise<number> {
    const keys = await this.redis.keys(`${this.prefix}*`);
    let cleanedCount = 0;
    
    for (const key of keys) {
      const connections = await this.redis.hgetall(key);
      const now = Date.now();
      const expiredConnections: string[] = [];
      
      for (const [connectionId, dataStr] of Object.entries(connections)) {
        try {
          const data = JSON.parse(dataStr);
          if (now - data.timestamp > this.expiry * 1000) {
            expiredConnections.push(connectionId);
          }
        } catch (error) {
          expiredConnections.push(connectionId);
        }
      }
      
      if (expiredConnections.length > 0) {
        await this.redis.hdel(key, ...expiredConnections);
        cleanedCount += expiredConnections.length;
      }
    }
    
    return cleanedCount;
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

// Deployment-scale optimization: Get memory usage statistics
export function getMemoryStats(): {
  totalProjects: number;
  totalConnections: number;
  memoryUsage: Record<string, number>;
} {
  const memoryUsage: Record<string, number> = {};
  let totalConnections = 0;
  
  for (const [projectId, projectControllers] of controllers.entries()) {
    const connectionCount = projectControllers.size;
    memoryUsage[projectId] = connectionCount;
    totalConnections += connectionCount;
  }
  
  return {
    totalProjects: controllers.size,
    totalConnections,
    memoryUsage
  };
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

  async getAllProjectConnectionCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const [projectId, connections] of this.connections.entries()) {
      counts[projectId] = connections.size;
    }
    return counts;
  }

  async cleanupExpiredConnections(): Promise<void> {
    // No cleanup needed for in-memory storage
  }

  async batchCleanupExpiredConnections(): Promise<number> {
    // No cleanup needed for in-memory storage
    return 0;
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