import { userRepository } from '../repositories/user.repository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAuthTokens, verifyToken, generateAccessToken } from '../utils/jwt.js';
import { User, UserPublicProfile, AuthTokens } from '../types/index.js';
import { RegisterInput, LoginInput, UpdateProfileInput, ChangePasswordInput } from '../validators/auth.validator.js';

export class AuthService {
  private formatUserProfile(user: User): UserPublicProfile {
    const { password_hash, ...profile } = user;
    return profile;
  }

  async register(input: RegisterInput): Promise<{ user: UserPublicProfile; tokens: AuthTokens }> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error('An account with this email address already exists');
    }

    const hashedPassword = await hashPassword(input.password);
    const createdUser = await userRepository.create({
      email: normalizedEmail,
      password_hash: hashedPassword,
      full_name: input.fullName
    });

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

    const user = await userRepository.findByEmail(normalizedEmail);
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
    const user = await userRepository.findById(userId);
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

      const user = await userRepository.findById(decoded.userId);
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
    const updatedUser = await userRepository.updateProfile(userId, {
      full_name: input.fullName,
      avatar_url: input.avatarUrl
    });

    if (!updatedUser) {
      throw new Error('Failed to update profile');
    }

    return this.formatUserProfile(updatedUser);
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user || !user.password_hash) {
      throw new Error('User not found');
    }

    const isMatch = await comparePassword(input.currentPassword, user.password_hash);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    const newPasswordHash = await hashPassword(input.newPassword);
    const updated = await userRepository.updatePassword(userId, newPasswordHash);
    if (!updated) {
      throw new Error('Failed to update password');
    }
  }
}

export const authService = new AuthService();
