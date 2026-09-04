import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const sanitizeUrl = (raw?: string | null): string => {
  if (!raw) return 'https://placeholder.supabase.co';
  let cleaned = raw.trim().replace(/^["'`]|["'`]$/g, '').trim().replace(/\/+$/, '');
  if (!cleaned) return 'https://placeholder.supabase.co';
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
};

const sanitizeKey = (raw?: string | null, fallback = ''): string => {
  if (!raw) return fallback;
  const cleaned = raw.trim().replace(/^["'`]|["'`]$/g, '').trim();
  return cleaned || fallback;
};

const rawUrl = env.SUPABASE_URL;
export const safeUrl = sanitizeUrl(rawUrl);
export const safeAnonKey = sanitizeKey(env.SUPABASE_ANON_KEY, 'placeholder-anon-key');
export const safeServiceKey = sanitizeKey(env.SUPABASE_SERVICE_ROLE_KEY, safeAnonKey);

export const isSupabaseConfigured = Boolean(
  safeUrl &&
    !safeUrl.includes('placeholder.supabase.co') &&
    !safeUrl.includes('example.supabase.co') &&
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
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Supabase environment variables (SUPABASE_URL / SUPABASE_ANON_KEY) are missing or set to defaults.'
    };
  }

  try {
    const { error } = await supabaseAdmin.from('users').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    logger.warn(`Supabase connection check failed: ${err.message}`);
    return { ok: false, message: err.message };
  }
};
