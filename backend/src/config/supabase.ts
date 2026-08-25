import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Public Supabase client (anon key)
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

// Admin Supabase client (service role key, bypasses RLS for administrative operations)
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const checkSupabaseConnection = async (): Promise<{ ok: boolean; message?: string }> => {
  try {
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    logger.warn(`Supabase connection check failed: ${err.message}`);
    return { ok: false, message: err.message };
  }
};
