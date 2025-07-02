import Redis from 'ioredis';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import logger from './logger';

export class CacheService {
  private redis: Redis;
  private defaultTTL: number = 3600; // 1 hour

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    this.defaultTTL = parseInt(process.env.REDIS_TTL || '3600');
  }

  /**
   * Get value from cache
   */
  public get = <T>(key: string): TE.TaskEither<Error, T | null> =>
    TE.tryCatch(
      async () => {
        const value = await this.redis.get(key);
        if (!value) return null;
        
        try {
          return JSON.parse(value) as T;
        } catch {
          // If parsing fails, return as string
          return value as unknown as T;
        }
      },
      (error) => new Error(`Cache get error: ${error}`)
    );

  /**
   * Set value in cache
   */
  public set = (
    key: string, 
    value: any, 
    ttl: number = this.defaultTTL
  ): TE.TaskEither<Error, void> =>
    TE.tryCatch(
      async () => {
        const serializedValue = typeof value === 'string' 
          ? value 
          : JSON.stringify(value);
        
        await this.redis.setex(key, ttl, serializedValue);
      },
      (error) => new Error(`Cache set error: ${error}`)
    );

  /**
   * Delete key from cache
   */
  public del = (key: string): TE.TaskEither<Error, void> =>
    TE.tryCatch(
      async () => {
        await this.redis.del(key);
      },
      (error) => new Error(`Cache delete error: ${error}`)
    );

  /**
   * Check if key exists in cache
   */
  public exists = (key: string): TE.TaskEither<Error, boolean> =>
    TE.tryCatch(
      async () => {
        const result = await this.redis.exists(key);
        return result === 1;
      },
      (error) => new Error(`Cache exists error: ${error}`)
    );

  /**
   * Get or set pattern - retrieve from cache or compute and cache
   */
  public getOrSet = <T>(
    key: string,
    computation: () => TE.TaskEither<Error, T>,
    ttl: number = this.defaultTTL
  ): TE.TaskEither<Error, T> =>
    pipe(
      this.get<T>(key),
      TE.chain((cached) => {
        if (cached !== null) {
          logger.debug(`Cache hit for key: ${key}`);
          return TE.right(cached);
        }
        
        logger.debug(`Cache miss for key: ${key}, computing value`);
        return pipe(
          computation(),
          TE.chain((computed) =>
            pipe(
              this.set(key, computed, ttl),
              TE.map(() => computed)
            )
          )
        );
      })
    );

  /**
   * Increment a counter in cache
   */
  public increment = (
    key: string, 
    by: number = 1,
    ttl?: number
  ): TE.TaskEither<Error, number> =>
    TE.tryCatch(
      async () => {
        const result = await this.redis.incrby(key, by);
        if (ttl !== undefined) {
          await this.redis.expire(key, ttl);
        }
        return result;
      },
      (error) => new Error(`Cache increment error: ${error}`)
    );

  /**
   * Get multiple keys at once
   */
  public mget = <T>(keys: string[]): TE.TaskEither<Error, (T | null)[]> =>
    TE.tryCatch(
      async () => {
        const values = await this.redis.mget(...keys);
        return values.map(value => {
          if (!value) return null;
          try {
            return JSON.parse(value) as T;
          } catch {
            return value as unknown as T;
          }
        });
      },
      (error) => new Error(`Cache mget error: ${error}`)
    );

  /**
   * Set multiple key-value pairs
   */
  public mset = (
    keyValuePairs: Record<string, any>,
    ttl?: number
  ): TE.TaskEither<Error, void> =>
    TE.tryCatch(
      async () => {
        const pairs: string[] = [];
        Object.entries(keyValuePairs).forEach(([key, value]) => {
          pairs.push(key, typeof value === 'string' ? value : JSON.stringify(value));
        });
        
        await this.redis.mset(...pairs);
        
        if (ttl !== undefined) {
          const expirePromises = Object.keys(keyValuePairs).map(key =>
            this.redis.expire(key, ttl)
          );
          await Promise.all(expirePromises);
        }
      },
      (error) => new Error(`Cache mset error: ${error}`)
    );

  /**
   * Clear all cache
   */
  public flush = (): TE.TaskEither<Error, void> =>
    TE.tryCatch(
      async () => {
        await this.redis.flushdb();
        logger.info('Cache flushed successfully');
      },
      (error) => new Error(`Cache flush error: ${error}`)
    );

  /**
   * Get cache statistics
   */
  public getStats = (): TE.TaskEither<Error, any> =>
    TE.tryCatch(
      async () => {
        const info = await this.redis.info('memory');
        return {
          connected: this.redis.status === 'ready',
          memory: info,
          db_size: await this.redis.dbsize()
        };
      },
      (error) => new Error(`Cache stats error: ${error}`)
    );

  /**
   * Generate cache key with prefix
   */
  public static generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `sei_portfolio:${prefix}:${parts.join(':')}`;
  }

  /**
   * Close Redis connection
   */
  public close(): void {
    this.redis.disconnect();
  }
}

// Export singleton instance
export const cacheService = new CacheService();