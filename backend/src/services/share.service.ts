import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { shareRepository, ShareWithGrantee } from '../repositories/share.repository.js';
import { fileRepository } from '../repositories/file.repository.js';
import { folderRepository } from '../repositories/folder.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { storageService } from './storage.service.js';
import { CreateShareInput, CreateLinkShareInput } from '../validators/share.validator.js';
import { Share, LinkShare, ResourceType, UserRole } from '../types/index.js';

export interface SharedResourceItem {
  shareId: string;
  role: UserRole;
  sharedAt: string;
  owner: {
    id: string;
    email: string;
    fullName?: string | null;
  };
  resource: any;
}

export class ShareService {
  async shareWithUser(
    callerId: string,
    input: CreateShareInput
  ): Promise<{ share: Share; grantee: { id: string; email: string; fullName?: string | null } }> {
    // 1. Verify resource existence & caller permission
    await this.assertCanManageResource(callerId, input.resourceType, input.resourceId);

    // 2. Validate grantee recipient
    const recipient = await userRepository.findByEmail(input.granteeEmail.toLowerCase());
    if (!recipient) {
      throw new Error(`No account found with email "${input.granteeEmail}".`);
    }

    if (recipient.id === callerId) {
      throw new Error('You cannot share items with yourself.');
    }

    // 3. Create or update share record
    const share = await shareRepository.createOrUpdateShare({
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      grantee_user_id: recipient.id,
      role: input.role,
      created_by: callerId
    });

    return {
      share,
      grantee: {
        id: recipient.id,
        email: recipient.email,
        fullName: recipient.full_name
      }
    };
  }

  async listSharesForResource(
    callerId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<{
    shares: Array<Share & { grantee: { id: string; email: string; fullName?: string | null } }>;
    publicLink: (LinkShare & { hasPassword: boolean }) | null;
  }> {
    await this.assertCanAccessResource(callerId, resourceType, resourceId);

    const [rawShares, linkShare] = await Promise.all([
      shareRepository.listSharesByResource(resourceType, resourceId),
      shareRepository.findLinkShareByResource(resourceType, resourceId)
    ]);

    const detailedShares = await Promise.all(
      rawShares.map(async (s) => {
        const grantee = await userRepository.findById(s.grantee_user_id);
        return {
          ...s,
          grantee: {
            id: s.grantee_user_id,
            email: grantee?.email || 'Unknown',
            fullName: grantee?.full_name || null
          }
        };
      })
    );

    let publicLinkResult: (LinkShare & { hasPassword: boolean }) | null = null;
    if (linkShare) {
      publicLinkResult = {
        ...linkShare,
        hasPassword: !!linkShare.password_hash
      };
    }

    return {
      shares: detailedShares,
      publicLink: publicLinkResult
    };
  }

  async listSharedWithMe(
    userId: string
  ): Promise<{ folders: SharedResourceItem[]; files: SharedResourceItem[] }> {
    const shares = await shareRepository.listSharedWithMe(userId);

    const sharedFolders: SharedResourceItem[] = [];
    const sharedFiles: SharedResourceItem[] = [];

    for (const share of shares) {
      const owner = await userRepository.findById(share.created_by);
      const ownerInfo = {
        id: share.created_by,
        email: owner?.email || 'Unknown',
        fullName: owner?.full_name || null
      };

      if (share.resource_type === 'folder') {
        const folder = await folderRepository.findById(share.resource_id);
        if (folder && !folder.is_deleted) {
          sharedFolders.push({
            shareId: share.id,
            role: share.role,
            sharedAt: share.created_at,
            owner: ownerInfo,
            resource: folder
          });
        }
      } else if (share.resource_type === 'file') {
        const file = await fileRepository.findById(share.resource_id);
        if (file && !file.is_deleted) {
          sharedFiles.push({
            shareId: share.id,
            role: share.role,
            sharedAt: share.created_at,
            owner: ownerInfo,
            resource: file
          });
        }
      }
    }

    return {
      folders: sharedFolders,
      files: sharedFiles
    };
  }

  async revokeShare(callerId: string, shareId: string): Promise<void> {
    const share = await shareRepository.findShareById(shareId);
    if (!share) {
      throw new Error('Share not found');
    }

    await this.assertCanManageResource(callerId, share.resource_type, share.resource_id);
    await shareRepository.deleteShare(shareId);
  }

  // ==========================================
  // Public Link Shares
  // ==========================================

  async createPublicLink(
    callerId: string,
    input: CreateLinkShareInput
  ): Promise<LinkShare & { hasPassword: boolean }> {
    await this.assertCanManageResource(callerId, input.resourceType, input.resourceId);

    const token = crypto.randomBytes(16).toString('hex');
    let passwordHash: string | null = null;

    if (input.password && input.password.trim()) {
      passwordHash = await bcrypt.hash(input.password.trim(), 10);
    }

    const link = await shareRepository.createOrUpdateLinkShare({
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      token,
      password_hash: passwordHash,
      role: input.role || 'viewer',
      expires_at: input.expiresAt || null,
      created_by: callerId
    });

    return {
      ...link,
      hasPassword: !!passwordHash
    };
  }

  async getPublicLink(
    callerId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<(LinkShare & { hasPassword: boolean }) | null> {
    await this.assertCanAccessResource(callerId, resourceType, resourceId);
    const link = await shareRepository.findLinkShareByResource(resourceType, resourceId);
    if (!link) return null;

    return {
      ...link,
      hasPassword: !!link.password_hash
    };
  }

  async revokePublicLink(callerId: string, linkShareId: string): Promise<void> {
    const link = await shareRepository.findLinkShareById(linkShareId);
    if (link) {
      await this.assertCanManageResource(callerId, link.resource_type, link.resource_id);
    }
    await shareRepository.deleteLinkShare(linkShareId);
  }

  async accessPublicLink(
    token: string,
    password?: string
  ): Promise<{
    resourceType: ResourceType;
    resource: any;
    role: string;
    downloadUrl?: string;
  }> {
    const link = await shareRepository.findLinkShareByToken(token);
    if (!link) {
      throw new Error('Shared link not found or has been revoked.');
    }

    // 1. Check expiration
    if (link.expires_at) {
      const expiry = new Date(link.expires_at).getTime();
      if (Date.now() > expiry) {
        throw new Error('This shared link has expired.');
      }
    }

    // 2. Check password if required
    if (link.password_hash) {
      if (!password) {
        throw new Error('PASSWORD_REQUIRED');
      }
      const match = await bcrypt.compare(password, link.password_hash);
      if (!match) {
        throw new Error('Incorrect password for shared link.');
      }
    }

    // 3. Return resource info
    if (link.resource_type === 'file') {
      const file = await fileRepository.findById(link.resource_id);
      if (!file || file.is_deleted) {
        throw new Error('The shared file is no longer available.');
      }

      const download = await storageService.getDownloadUrl(file.owner_id, file.id);
      return {
        resourceType: 'file',
        resource: file,
        role: link.role,
        downloadUrl: download.downloadUrl
      };
    } else {
      const folder = await folderRepository.findById(link.resource_id);
      if (!folder || folder.is_deleted) {
        throw new Error('The shared folder is no longer available.');
      }

      const contents = await folderRepository.listByParent(folder.owner_id, folder.id);
      const files = await fileRepository.listByOwner(folder.owner_id, {
        folderId: folder.id,
        status: 'ready'
      });

      return {
        resourceType: 'folder',
        resource: {
          ...folder,
          folders: contents,
          files: files.files
        },
        role: link.role
      };
    }
  }

  // ==========================================
  // Helper Permission Assertions
  // ==========================================

  private async assertCanAccessResource(
    userId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<void> {
    if (resourceType === 'file') {
      const file = await fileRepository.findById(resourceId);
      if (!file || file.is_deleted) throw new Error('File not found');
      if (file.owner_id === userId) return;
    } else {
      const folder = await folderRepository.findById(resourceId);
      if (!folder || folder.is_deleted) throw new Error('Folder not found');
      if (folder.owner_id === userId) return;
    }

    const role = await shareRepository.getUserRoleOnResource(userId, resourceType, resourceId);
    if (!role) {
      throw new Error('You do not have permission to access this resource');
    }
  }

  private async assertCanManageResource(
    userId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<void> {
    if (resourceType === 'file') {
      const file = await fileRepository.findById(resourceId);
      if (!file || file.is_deleted) throw new Error('File not found');
      if (file.owner_id === userId) return;
    } else {
      const folder = await folderRepository.findById(resourceId);
      if (!folder || folder.is_deleted) throw new Error('Folder not found');
      if (folder.owner_id === userId) return;
    }

    const role = await shareRepository.getUserRoleOnResource(userId, resourceType, resourceId);
    if (role !== 'editor' && role !== 'owner') {
      throw new Error('Only the owner or editors can manage sharing permissions for this resource');
    }
  }
}

export const shareService = new ShareService();
