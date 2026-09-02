import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';
import { User } from '../types/index.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

// In-memory fallback map for offline development and testing
export const devFallbackUsers = new Map<string, User>();

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase().trim();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', normalized)
          .maybeSingle();

        if (!error && data) {
          return data as User;
        }
      } catch (err: any) {
        logger.warn(`UserRepository.findByEmail exception: ${err.message}`);
      }
    }

    return devFallbackUsers.get(normalized) || null;
  }

  async findById(id: string): Promise<User | null> {
    // If it's stored in fallback map, return immediately
    if (devFallbackUsers.has(id)) {
      return devFallbackUsers.get(id)!;
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          return data as User;
        }
      } catch (err: any) {
        logger.warn(`UserRepository.findById exception: ${err.message}`);
      }
    }

    return devFallbackUsers.get(id) || null;
  }

  async create(user: {
    id?: string;
    email: string;
    password_hash: string;
    full_name?: string;
    avatar_url?: string;
  }): Promise<User> {
    const normalized = user.email.toLowerCase().trim();
    const userId = user.id || crypto.randomUUID();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('users')
          .insert({
            id: userId,
            email: normalized,
            password_hash: user.password_hash,
            full_name: user.full_name || null,
            avatar_url: user.avatar_url || null,
            storage_used_bytes: 0,
            storage_quota_bytes: 5368709120 // 5 GB Default
          })
          .select()
          .single();

        if (!error && data) {
          return data as User;
        }
        logger.warn(`Supabase user insert failed, using fallback store: ${error?.message}`);
      } catch (err: any) {
        logger.warn(`UserRepository.create exception: ${err.message}`);
      }
    }

    const fallbackUser: User = {
      id: userId,
      email: normalized,
      password_hash: user.password_hash,
      full_name: user.full_name || null,
      avatar_url: user.avatar_url || null,
      storage_used_bytes: 0,
      storage_quota_bytes: 5368709120,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    devFallbackUsers.set(normalized, fallbackUser);
    devFallbackUsers.set(userId, fallbackUser);
    return fallbackUser;
  }

  async updateProfile(id: string, updates: { full_name?: string; avatar_url?: string }): Promise<User | null> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('users')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          return data as User;
        }
      } catch (err: any) {
        logger.warn(`UserRepository.updateProfile exception: ${err.message}`);
      }
    }

    const existing = devFallbackUsers.get(id);
    if (existing) {
      if (updates.full_name !== undefined) existing.full_name = updates.full_name;
      if (updates.avatar_url !== undefined) existing.avatar_url = updates.avatar_url;
      existing.updated_at = new Date().toISOString();
      return existing;
    }

    return null;
  }

  async updatePassword(id: string, newPasswordHash: string): Promise<User | null> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('users')
          .update({
            password_hash: newPasswordHash,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          return data as User;
        }
      } catch (err: any) {
        logger.warn(`UserRepository.updatePassword exception: ${err.message}`);
      }
    }

    const existing = devFallbackUsers.get(id);
    if (existing) {
      existing.password_hash = newPasswordHash;
      existing.updated_at = new Date().toISOString();
      return existing;
    }

    return null;
  }

  async updateStorageUsage(id: string, usedBytes: number): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin
          .from('users')
          .update({
            storage_used_bytes: usedBytes,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
      } catch (err: any) {
        logger.warn(`UserRepository.updateStorageUsage exception: ${err.message}`);
      }
    }

    const existing = devFallbackUsers.get(id);
    if (existing) {
      existing.storage_used_bytes = usedBytes;
      existing.updated_at = new Date().toISOString();
    }
  }
}

export const userRepository = new UserRepository();
