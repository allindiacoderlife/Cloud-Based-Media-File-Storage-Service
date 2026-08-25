import { Router, Request, Response } from 'express';
import { checkSupabaseConnection } from '../config/supabase.js';
import { checkRedisConnection } from '../config/redis.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const supabaseHealth = await checkSupabaseConnection();
  const redisHealth = await checkRedisConnection();

  const healthData = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {
      api: { status: 'up' },
      database: { status: supabaseHealth.ok ? 'connected' : 'disconnected', details: supabaseHealth.message },
      redis: { status: redisHealth.ok ? 'connected' : 'detached', details: redisHealth.message }
    }
  };

  return sendSuccess(res, healthData, 'System health check completed');
});

export const healthRoutes = router;
