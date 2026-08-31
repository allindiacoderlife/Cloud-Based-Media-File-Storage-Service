import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';
import { Share, LinkShare, ResourceType, UserRole } from '../types/index.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

// In-memory fallback maps for offline dev & tests
export const devFallbackShares = new Map<string, Share>();
export const devFallbackLinkShares = new Map<string, LinkShare>();

export interface ShareWithGrantee extends Share {
  grantee: {
    id: string;
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
}

export class ShareRepository {
  // ==========================================
  // User-to-User Shares
  // ==========================================

  async createOrUpdateShare(share: {
    id?: string;
    resource_type: ResourceType;
    resource_id: string;
    grantee_user_id: string;
    role: UserRole;
    created_by: string;
  }): Promise<Share> {
    const shareId = share.id || crypto.randomUUID();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('shares')
          .upsert(
            {
              id: shareId,
              resource_type: share.resource_type,
              resource_id: share.resource_id,
              grantee_user_id: share.grantee_user_id,
              role: share.role,
              created_by: share.created_by
            },
            { onConflict: 'resource_type,resource_id,grantee_user_id' }
          )
          .select()
          .single();

        if (!error && data) {
          return data as Share;
        }
        logger.warn(`Supabase share upsert failed, using fallback store: ${error?.message}`);
      } catch (err: any) {
        logger.warn(`ShareRepository.createOrUpdateShare exception: ${err.message}`);
      }
    }

    const fallbackShare: Share = {
      id: shareId,
      resource_type: share.resource_type,
      resource_id: share.resource_id,
      grantee_user_id: share.grantee_user_id,
      role: share.role,
      created_by: share.created_by,
      created_at: new Date().toISOString()
    };

    devFallbackShares.set(shareId, fallbackShare);
    return fallbackShare;
  }

  async findShareById(shareId: string): Promise<Share | null> {
    if (devFallbackShares.has(shareId)) {
      return devFallbackShares.get(shareId)!;
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('shares')
          .select('*')
          .eq('id', shareId)
          .maybeSingle();

        if (!error && data) {
          return data as Share;
        }
      } catch (err: any) {
        logger.warn(`ShareRepository.findShareById exception: ${err.message}`);
      }
    }

    return devFallbackShares.get(shareId) || null;
  }

  async listSharesByResource(
    resourceType: ResourceType,
    resourceId: string
  ): Promise<Share[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('shares')
          .select('*')
          .eq('resource_type', resourceType)
          .eq('resource_id', resourceId);

        if (!error && data && data.length > 0) {
          return data as Share[];
        }
      } catch (err: any) {
        logger.warn(`ShareRepository.listSharesByResource exception: ${err.message}`);
      }
    }

    return Array.from(devFallbackShares.values()).filter(
      (s) => s.resource_type === resourceType && s.resource_id === resourceId
    );
  }

  async listSharedWithMe(granteeUserId: string): Promise<Share[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('shares')
          .select('*')
          .eq('grantee_user_id', granteeUserId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data as Share[];
        }
      } catch (err: any) {
        logger.warn(`ShareRepository.listSharedWithMe exception: ${err.message}`);
      }
    }

    return Array.from(devFallbackShares.values()).filter(
      (s) => s.grantee_user_id === granteeUserId
    );
  }

  async deleteShare(shareId: string): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin.from('shares').delete().eq('id', shareId);
      } catch (err: any) {
        logger.warn(`ShareRepository.deleteShare exception: ${err.message}`);
      }
    }

    devFallbackShares.delete(shareId);
  }

  async getUserRoleOnResource(
    userId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<UserRole | null> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('shares')
          .select('role')
          .eq('resource_type', resourceType)
          .eq('resource_id', resourceId)
          .eq('grantee_user_id', userId)
          .maybeSingle();

        if (!error && data) {
          return data.role as UserRole;
        }
      } catch (err: any) {
        logger.warn(`ShareRepository.getUserRoleOnResource exception: ${err.message}`);
      }
    }

    const share = Array.from(devFallbackShares.values()).find(
      (s) =>
        s.resource_type === resourceType &&
        s.resource_id === resourceId &&
        s.grantee_user_id === userId
    );

    return share ? share.role : null;
  }

  // ==========================================
  // Public Link Shares
  // ==========================================

  async createOrUpdateLinkShare(link: {
    id?: string;
    resource_type: ResourceType;
    resource_id: string;
    token: string;
    password_hash?: string | null;
    role: 'viewer' | 'editor';
    expires_at?: string | null;
    created_by: string;
  }): Promise<LinkShare> {
    const linkId = link.id || crypto.randomUUID();

    if (isSupabaseConfigured) {
      try {
        // Delete old link share for same resource if exists
        await supabaseAdmin
          .from('link_shares')
          .delete()
          .eq('resource_type', link.resource_type)
          .eq('resource_id', link.resource_id);

        const { data, error } = await supabaseAdmin
          .from('link_shares')
          .insert({
            id: linkId,
            resource_type: link.resource_type,
            resource_id: link.resource_id,
            token: link.token,
            password_hash: link.password_hash || null,
            role: link.role,
            expires_at: link.expires_at || null,
            created_by: link.created_by
          })
          .select()
          .single();

        if (!error && data) {
          return data as LinkShare;
        }
        logger.warn(`Supabase link_shares insert failed, using fallback store: ${error?.message}`);
      } catch (err: any) {
        logger.warn(`ShareRepository.createOrUpdateLinkShare exception: ${err.message}`);
      }
    }

    // Clear old in fallback
    for (const [id, ls] of devFallbackLinkShares.entries()) {
      if (ls.resource_type === link.resource_type && ls.resource_id === link.resource_id) {
        devFallbackLinkShares.delete(id);
      }
    }

    const fallbackLink: LinkShare = {
      id: linkId,
      resource_type: link.resource_type,
      resource_id: link.resource_id,
      token: link.token,
      password_hash: link.password_hash || null,
      role: link.role,
      expires_at: link.expires_at || null,
      created_by: link.created_by,
      created_at: new Date().toISOString()
    };

    devFallbackLinkShares.set(linkId, fallbackLink);
    return fallbackLink;
  }

  async findLinkShareById(linkShareId: string): Promise<LinkShare | null> {
    const fallback = devFallbackLinkShares.get(linkShareId);
    if (fallback) return fallback;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('link_shares')
          .select('*')
          .eq('id', linkShareId)
          .maybeSingle();

        if (!error && data) {
          return data as LinkShare;
        }
      } catch (err: any) {
        logger.warn(`ShareRepository.findLinkShareById exception: ${err.message}`);
      }
    }

    return null;
  }

  async findLinkShareByToken(token: string): Promise<LinkShare | null> {
    const fallback = Array.from(devFallbackLinkShares.values()).find((l) => l.token === token);
    if (fallback) return fallback;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('link_shares')
          .select('*')
          .eq('token', token)
          .maybeSingle();

        if (!error && data) {
          return data as LinkShare;
        }
      } catch (err: any) {
        logger.warn(`ShareRepository.findLinkShareByToken exception: ${err.message}`);
      }
    }

    return null;
  }

  async findLinkShareByResource(
    resourceType: ResourceType,
    resourceId: string
  ): Promise<LinkShare | null> {
    const fallback = Array.from(devFallbackLinkShares.values()).find(
      (l) => l.resource_type === resourceType && l.resource_id === resourceId
    );
    if (fallback) return fallback;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('link_shares')
          .select('*')
          .eq('resource_type', resourceType)
          .eq('resource_id', resourceId)
          .maybeSingle();

        if (!error && data) {
          return data as LinkShare;
        }
      } catch (err: any) {
        logger.warn(`ShareRepository.findLinkShareByResource exception: ${err.message}`);
      }
    }

    return null;
  }

  async deleteLinkShare(linkShareId: string): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin.from('link_shares').delete().eq('id', linkShareId);
      } catch (err: any) {
        logger.warn(`ShareRepository.deleteLinkShare exception: ${err.message}`);
      }
    }

    devFallbackLinkShares.delete(linkShareId);
  }
}

export const shareRepository = new ShareRepository();
