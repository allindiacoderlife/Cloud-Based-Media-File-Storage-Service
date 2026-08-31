import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../config/redis.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

// In-memory fallback map for rate limiting when Redis is detached or testing
const memoryStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (options: RateLimitOptions) => {
  const { windowMs, max, message = 'Too many requests, please try again later.' } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `ratelimit:${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    try {
      const redis = getRedisClient();
      if (redis.status === 'ready' || redis.status === 'connect') {
        const current = await redis.incr(key);
        if (current === 1) {
          await redis.pexpire(key, windowMs);
        }

        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));

        if (current > max) {
          sendError(res, message, 429);
          return;
        }
        return next();
      }
    } catch (err: any) {
      logger.warn(`Redis rate limiter fallback to memory: ${err.message}`);
    }

    // In-memory fallback
    const record = memoryStore.get(key as string);

    if (!record || now > record.resetTime) {
      memoryStore.set(key as string, { count: 1, resetTime: now + windowMs });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      return next();
    }

    record.count += 1;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));

    if (record.count > max) {
      sendError(res, message, 429);
      return;
    }

    return next();
  };
};

export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 auth requests per 15 minutes
  message: 'Too many authentication attempts. Please try again after 15 minutes.'
});

export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // max 120 requests per minute
  message: 'API rate limit exceeded. Please slow down your requests.'
});
