import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const rawUrl = env.SUPABASE_URL?.trim();
const safeUrl =
  rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
    ? rawUrl
    : 'https://placeholder.supabase.co';

const safeAnonKey = env.SUPABASE_ANON_KEY?.trim() || 'placeholder-anon-key';
const safeServiceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim() || 'placeholder-service-role-key';

export const isSupabaseConfigured = Boolean(
  rawUrl &&
    !rawUrl.includes('placeholder.supabase.co') &&
    !rawUrl.includes('example.supabase.co') &&
    safeAnonKey !== 'placeholder-anon-key' &&
    safeAnonKey !== 'default-anon-key'
);

// Public Supabase client (anon key)
export const supabase = createClient(safeUrl, safeAnonKey);

// Admin Supabase client (service role key, bypasses RLS for administrative operations)
export const supabaseAdmin = createClient(safeUrl, safeServiceKey, {
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
