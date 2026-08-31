import { z } from 'zod';

export const createFolderSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Folder name is required' })
    .max(255, { message: 'Folder name cannot exceed 255 characters' })
    .refine((val) => !/[\\/:\*\?"<>\|]/.test(val), {
      message: 'Folder name contains invalid characters'
    }),
  parentId: z.string().uuid().nullable().optional()
});

export const updateFolderSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Folder name is required' })
    .max(255, { message: 'Folder name cannot exceed 255 characters' })
    .refine((val) => !/[\\/:\*\?"<>\|]/.test(val), {
      message: 'Folder name contains invalid characters'
    })
    .optional(),
  parentId: z.string().uuid().nullable().optional()
});

export const folderQuerySchema = z.object({
  parentId: z.string().optional()
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
export type FolderQueryInput = z.infer<typeof folderQuerySchema>;
