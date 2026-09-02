import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(1, { message: 'Full name is required' })
    .min(2, { message: 'Full name must be at least 2 characters' })
    .max(100, { message: 'Full name must not exceed 100 characters' })
    .refine((val) => !/^\d+$/.test(val.replace(/\s+/g, '')), {
      message: 'Full name cannot contain only numbers'
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Full name must contain at least one letter'
    }),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email({ message: 'Please provide a valid email address' })
    .refine((val) => !/^\d+$/.test(val.replace(/\s+/g, '')), {
      message: 'Email cannot be only numbers. Please provide a valid email address'
    }),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, { message: 'Password must be at least 6 characters long' })
    .max(100, { message: 'Password must not exceed 100 characters' })
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please provide a valid email address' })
    .refine((val) => !/^\d+$/.test(val.replace(/\s+/g, '')), {
      message: 'Email cannot be only numbers. Please provide a valid email address'
    }),
  password: z.string().min(1, { message: 'Password is required' })
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, { message: 'Refresh token is required' })
});

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: 'Full name must be at least 2 characters' })
    .max(100, { message: 'Full name must not exceed 100 characters' })
    .refine((val) => !/^\d+$/.test(val.replace(/\s+/g, '')), {
      message: 'Full name cannot contain only numbers'
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Full name must contain at least one letter'
    })
    .optional(),
  avatarUrl: z.string().url({ message: 'Avatar URL must be a valid URL' }).optional().or(z.literal(''))
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Current password is required' }),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(6, { message: 'New password must be at least 6 characters long' })
    .max(100, { message: 'New password must not exceed 100 characters' })
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

