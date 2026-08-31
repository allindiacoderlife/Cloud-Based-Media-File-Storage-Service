import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';
import { ActivityLog, ResourceType } from '../types/index.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

// In-memory fallback for activity logs
export const devFallbackActivities: ActivityLog[] = [];

export class ActivityRepository {
  async logActivity(activity: {
    user_id: string;
    action: string;
    resource_type?: ResourceType | null;
    resource_id?: string | null;
    details?: Record<string, any> | null;
  }): Promise<ActivityLog> {
    const activityId = crypto.randomUUID();
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('activity_logs')
          .insert({
            id: activityId,
            user_id: activity.user_id,
            action: activity.action,
            resource_type: activity.resource_type || null,
            resource_id: activity.resource_id || null,
            details: activity.details || {}
          })
          .select()
          .single();

        if (!error && data) {
          return data as ActivityLog;
        }
      } catch (err: any) {
        logger.warn(`ActivityRepository.logActivity exception: ${err.message}`);
      }
    }

    const fallbackLog: ActivityLog = {
      id: activityId,
      user_id: activity.user_id,
      action: activity.action,
      resource_type: activity.resource_type || null,
      resource_id: activity.resource_id || null,
      details: activity.details || {},
      created_at: now
    };

    devFallbackActivities.unshift(fallbackLog);
    return fallbackLog;
  }

  async listRecentActivity(userId: string, limit = 30): Promise<ActivityLog[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('activity_logs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!error && data && data.length > 0) {
          return data as ActivityLog[];
        }
      } catch (err: any) {
        logger.warn(`ActivityRepository.listRecentActivity exception: ${err.message}`);
      }
    }

    return devFallbackActivities
      .filter((a) => a.user_id === userId)
      .slice(0, limit);
  }
}

export const activityRepository = new ActivityRepository();
