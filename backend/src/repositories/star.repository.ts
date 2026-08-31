import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';
import { Star, ResourceType } from '../types/index.js';
import { logger } from '../utils/logger.js';

// In-memory fallback set for offline dev & tests: `${userId}:${resourceType}:${resourceId}` -> Star
export const devFallbackStars = new Map<string, Star>();

export class StarRepository {
  async toggleStar(
    userId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<{ isStarred: boolean; star: Star | null }> {
    const key = `${userId}:${resourceType}:${resourceId}`;

    if (isSupabaseConfigured) {
      try {
        // Check if star exists
        const { data: existing } = await supabaseAdmin
          .from('stars')
          .select('*')
          .eq('user_id', userId)
          .eq('resource_type', resourceType)
          .eq('resource_id', resourceId)
          .maybeSingle();

        if (existing) {
          // Remove star
          await supabaseAdmin
            .from('stars')
            .delete()
            .eq('user_id', userId)
            .eq('resource_type', resourceType)
            .eq('resource_id', resourceId);

          devFallbackStars.delete(key);
          return { isStarred: false, star: null };
        } else {
          // Add star
          const { data: newStar, error } = await supabaseAdmin
            .from('stars')
            .insert({
              user_id: userId,
              resource_type: resourceType,
              resource_id: resourceId
            })
            .select()
            .single();

          if (!error && newStar) {
            devFallbackStars.set(key, newStar as Star);
            return { isStarred: true, star: newStar as Star };
          }
        }
      } catch (err: any) {
        logger.warn(`StarRepository.toggleStar Supabase exception: ${err.message}`);
      }
    }

    if (devFallbackStars.has(key)) {
      devFallbackStars.delete(key);
      return { isStarred: false, star: null };
    } else {
      const fallbackStar: Star = {
        user_id: userId,
        resource_type: resourceType,
        resource_id: resourceId,
        created_at: new Date().toISOString()
      };
      devFallbackStars.set(key, fallbackStar);
      return { isStarred: true, star: fallbackStar };
    }
  }

  async isStarred(
    userId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<boolean> {
    const key = `${userId}:${resourceType}:${resourceId}`;
    if (devFallbackStars.has(key)) return true;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('stars')
          .select('resource_id')
          .eq('user_id', userId)
          .eq('resource_type', resourceType)
          .eq('resource_id', resourceId)
          .maybeSingle();

        if (!error && data) return true;
      } catch (err: any) {
        logger.warn(`StarRepository.isStarred exception: ${err.message}`);
      }
    }

    return false;
  }

  async listStarredByUser(userId: string): Promise<Star[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('stars')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data as Star[];
        }
      } catch (err: any) {
        logger.warn(`StarRepository.listStarredByUser exception: ${err.message}`);
      }
    }

    return Array.from(devFallbackStars.values()).filter((s) => s.user_id === userId);
  }

  async getStarredIds(userId: string, resourceType: ResourceType): Promise<Set<string>> {
    const stars = await this.listStarredByUser(userId);
    const ids = stars
      .filter((s) => s.resource_type === resourceType)
      .map((s) => s.resource_id);

    return new Set(ids);
  }
}

export const starRepository = new StarRepository();
