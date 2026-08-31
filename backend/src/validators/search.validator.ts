import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().trim().optional(),
  type: z.enum(['all', 'file', 'folder']).optional().default('all'),
  category: z
    .enum(['all', 'document', 'image', 'video', 'audio', 'archive', 'code'])
    .optional()
    .default('all'),
  mimeType: z.string().optional(),
  minSize: z.coerce.number().int().min(0).optional(),
  maxSize: z.coerce.number().int().positive().optional(),
  sortBy: z.enum(['name', 'size_bytes', 'created_at', 'updated_at']).optional().default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export const toggleStarSchema = z.object({
  resourceType: z.enum(['file', 'folder'], {
    message: 'Resource type must be either "file" or "folder"'
  }),
  resourceId: z.string().min(1, { message: 'Resource ID is required' })
});

export const recentActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30)
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type ToggleStarInput = z.infer<typeof toggleStarSchema>;
export type RecentActivityQueryInput = z.infer<typeof recentActivityQuerySchema>;
