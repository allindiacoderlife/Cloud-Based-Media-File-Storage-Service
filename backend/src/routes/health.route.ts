import { Router, Request, Response } from 'express';
import { checkSupabaseConnection } from '../config/supabase.js';
import { checkRedisConnection } from '../config/redis.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const supabaseHealth = await checkSupabaseConnection();
  const redisHealth = await checkRedisConnection();

  let supabaseHostname = 'unset';
  try {
    if (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) {
      supabaseHostname = new URL(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname;
    }
  } catch {}

  const healthData = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: supabaseHealth.ok ? 'healthy' : 'degraded',
    environment: process.env.VERCEL ? 'vercel-serverless' : process.env.NODE_ENV || 'development',
    services: {
      api: { status: 'up' },
      database: {
        status: supabaseHealth.ok ? 'connected' : 'disconnected',
        details: supabaseHealth.message,
        diagnostics: {
          supabaseHost: supabaseHostname,
          hasSupabaseUrl: Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
          hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
          hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
        }
      },
      redis: { status: redisHealth.ok ? 'connected' : 'detached', details: redisHealth.message }
    }
  };

  return sendSuccess(res, healthData, 'System health check completed');
});

export const healthRoutes = router;
