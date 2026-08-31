import { z } from 'zod';

export const createShareSchema = z.object({
  resourceType: z.enum(['file', 'folder'], {
    message: 'Resource type must be either "file" or "folder"'
  }),
  resourceId: z.string().min(1, { message: 'Resource ID is required' }),
  granteeEmail: z.string().trim().email({ message: 'Valid grantee email address is required' }),
  role: z.enum(['viewer', 'editor'], {
    message: 'Role must be either "viewer" or "editor"'
  })
});

export const createLinkShareSchema = z.object({
  resourceType: z.enum(['file', 'folder'], {
    message: 'Resource type must be either "file" or "folder"'
  }),
  resourceId: z.string().min(1, { message: 'Resource ID is required' }),
  role: z.enum(['viewer', 'editor']).optional().default('viewer'),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  password: z
    .string()
    .min(4, { message: 'Password must be at least 4 characters' })
    .max(100)
    .optional()
});

export const accessLinkShareSchema = z.object({
  password: z.string().optional()
});

export type CreateShareInput = z.infer<typeof createShareSchema>;
export type CreateLinkShareInput = z.infer<typeof createLinkShareSchema>;
export type AccessLinkShareInput = z.infer<typeof accessLinkShareSchema>;
