import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email({ message: 'Please provide a valid email address' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters long' })
    .max(100, { message: 'Password must not exceed 100 characters' }),
  fullName: z.string().trim().min(2, { message: 'Full name must be at least 2 characters' }).optional()
});

export const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Please provide a valid email address' }),
  password: z.string().min(1, { message: 'Password is required' })
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, { message: 'Refresh token is required' })
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  avatarUrl: z.string().url().optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
