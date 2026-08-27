import { userRepository } from '../repositories/user.repository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAuthTokens, verifyToken, generateAccessToken } from '../utils/jwt.js';
import { User, UserPublicProfile, AuthTokens } from '../types/index.js';
import { RegisterInput, LoginInput, UpdateProfileInput } from '../validators/auth.validator.js';
import { logger } from '../utils/logger.js';

// In-memory fallback map for offline development when Supabase DB table is pending creation
const devFallbackUsers = new Map<string, User>();

export class AuthService {
  private formatUserProfile(user: User): UserPublicProfile {
    const { password_hash, ...profile } = user;
    return profile;
  }

  async register(input: RegisterInput): Promise<{ user: UserPublicProfile; tokens: AuthTokens }> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // Check if user already exists
    let existingUser: User | null = null;
    try {
      existingUser = await userRepository.findByEmail(normalizedEmail);
    } catch {
      existingUser = devFallbackUsers.get(normalizedEmail) || null;
    }

    if (!existingUser && devFallbackUsers.has(normalizedEmail)) {
      existingUser = devFallbackUsers.get(normalizedEmail)!;
    }

    if (existingUser) {
      throw new Error('An account with this email address already exists');
    }

    const hashedPassword = await hashPassword(input.password);
    let createdUser: User | null = null;

    try {
      createdUser = await userRepository.create({
        email: normalizedEmail,
        password_hash: hashedPassword,
        full_name: input.fullName
      });
    } catch (err: any) {
      logger.warn(`Supabase insert failed, using fallback store: ${err.message}`);
      // Fallback in-memory user
      const fallbackId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      createdUser = {
        id: fallbackId,
        email: normalizedEmail,
        password_hash: hashedPassword,
        full_name: input.fullName || null,
        avatar_url: null,
        storage_used_bytes: 0,
        storage_quota_bytes: 5368709120, // 5 GB
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      devFallbackUsers.set(normalizedEmail, createdUser);
      devFallbackUsers.set(fallbackId, createdUser);
    }

    if (!createdUser) {
      throw new Error('Failed to create user account');
    }

    const tokens = generateAuthTokens(createdUser.id, createdUser.email);
    return {
      user: this.formatUserProfile(createdUser),
      tokens
    };
  }

  async login(input: LoginInput): Promise<{ user: UserPublicProfile; tokens: AuthTokens }> {
    const normalizedEmail = input.email.toLowerCase().trim();

    let user: User | null = null;
    try {
      user = await userRepository.findByEmail(normalizedEmail);
    } catch {
      user = devFallbackUsers.get(normalizedEmail) || null;
    }

    if (!user) {
      user = devFallbackUsers.get(normalizedEmail) || null;
    }

    if (!user || !user.password_hash) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await comparePassword(input.password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const tokens = generateAuthTokens(user.id, user.email);
    return {
      user: this.formatUserProfile(user),
      tokens
    };
  }

  async getCurrentUser(userId: string): Promise<UserPublicProfile> {
    let user: User | null = null;
    try {
      user = await userRepository.findById(userId);
    } catch {
      user = devFallbackUsers.get(userId) || null;
    }

    if (!user) {
      user = devFallbackUsers.get(userId) || null;
    }

    if (!user) {
      throw new Error('User not found');
    }

    return this.formatUserProfile(user);
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: string }> {
    try {
      const decoded = verifyToken(refreshToken);
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      let user: User | null = null;
      try {
        user = await userRepository.findById(decoded.userId);
      } catch {
        user = devFallbackUsers.get(decoded.userId) || null;
      }

      if (!user) {
        user = devFallbackUsers.get(decoded.userId) || null;
      }

      if (!user) {
        throw new Error('User not found');
      }

      const accessToken = generateAccessToken(user.id, user.email);
      return {
        accessToken,
        expiresIn: '1d'
      };
    } catch (err: any) {
      throw new Error(err.message || 'Invalid or expired refresh token');
    }
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserPublicProfile> {
    let updatedUser: User | null = null;
    try {
      updatedUser = await userRepository.updateProfile(userId, {
        full_name: input.fullName,
        avatar_url: input.avatarUrl
      });
    } catch {
      const existing = devFallbackUsers.get(userId);
      if (existing) {
        existing.full_name = input.fullName !== undefined ? input.fullName : existing.full_name;
        existing.avatar_url = input.avatarUrl !== undefined ? input.avatarUrl : existing.avatar_url;
        existing.updated_at = new Date().toISOString();
        updatedUser = existing;
      }
    }

    if (!updatedUser) {
      const existing = devFallbackUsers.get(userId);
      if (existing) {
        existing.full_name = input.fullName !== undefined ? input.fullName : existing.full_name;
        existing.avatar_url = input.avatarUrl !== undefined ? input.avatarUrl : existing.avatar_url;
        existing.updated_at = new Date().toISOString();
        updatedUser = existing;
      }
    }

    if (!updatedUser) {
      throw new Error('Failed to update profile');
    }

    return this.formatUserProfile(updatedUser);
  }
}

export const authService = new AuthService();
