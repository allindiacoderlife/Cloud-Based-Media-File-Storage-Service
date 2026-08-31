import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    const commonOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy(times: number) {
        if (times > 3) {
          logger.warn('Redis reconnection retries exhausted; running in detached mode.');
          return null; // stop reconnecting
        }
        return Math.min(times * 200, 2000);
      }
    };

    if (env.REDIS_URL) {
      redisClient = new Redis(env.REDIS_URL, commonOptions);
    } else {
      redisClient = new Redis({
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD || undefined,
        tls: env.REDIS_TLS ? {} : undefined,
        ...commonOptions
      });
    }

    redisClient.on('connect', () => {
      logger.info('Connected to Redis server');
    });

    redisClient.on('error', (err) => {
      logger.warn(`Redis Error: ${err.message}`);
    });
  }

  return redisClient;
};

export const checkRedisConnection = async (): Promise<{ ok: boolean; message?: string }> => {
  try {
    const client = getRedisClient();
    if (client.status === 'wait') {
      await client.connect();
    }
    const pong = await client.ping();
    return { ok: pong === 'PONG' };
  } catch (err: any) {
    return { ok: false, message: err.message };
  }
};
