import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';
import { User } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    if (!isSupabaseConfigured) {
      return null;
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (error) {
        logger.warn(`Error finding user by email (${email}): ${error.message}`);
        return null;
      }

      return data as User | null;
    } catch (err: any) {
      logger.error(`UserRepository.findByEmail exception: ${err.message}`);
      return null;
    }
  }

  async findById(id: string): Promise<User | null> {
    if (!isSupabaseConfigured) {
      return null;
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        logger.warn(`Error finding user by id (${id}): ${error.message}`);
        return null;
      }

      return data as User | null;
    } catch (err: any) {
      logger.error(`UserRepository.findById exception: ${err.message}`);
      return null;
    }
  }

  async create(user: {
    email: string;
    password_hash: string;
    full_name?: string;
    avatar_url?: string;
  }): Promise<User | null> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured, using fallback store');
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          email: user.email.toLowerCase().trim(),
          password_hash: user.password_hash,
          full_name: user.full_name || null,
          avatar_url: user.avatar_url || null,
          storage_used_bytes: 0,
          storage_quota_bytes: 5368709120 // 5 GB Default
        })
        .select()
        .single();

      if (error) {
        logger.error(`Error creating user record: ${error.message}`);
        throw new Error(error.message);
      }

      return data as User;
    } catch (err: any) {
      logger.error(`UserRepository.create exception: ${err.message}`);
      throw err;
    }
  }

  async updateProfile(id: string, updates: { full_name?: string; avatar_url?: string }): Promise<User | null> {
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

      if (error) {
        logger.error(`Error updating user profile: ${error.message}`);
        throw new Error(error.message);
      }

      return data as User;
    } catch (err: any) {
      logger.error(`UserRepository.updateProfile exception: ${err.message}`);
      throw err;
    }
  }

  async updateStorageUsage(id: string, usedBytes: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          storage_used_bytes: usedBytes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        logger.error(`Error updating user storage usage: ${error.message}`);
      }
    } catch (err: any) {
      logger.error(`UserRepository.updateStorageUsage exception: ${err.message}`);
    }
  }
}

export const userRepository = new UserRepository();
