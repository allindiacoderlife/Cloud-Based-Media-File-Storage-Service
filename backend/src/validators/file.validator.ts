import { z } from 'zod';

// Maximum allowed single file upload size (e.g. 500 MB)
export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

export const initUploadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'File name is required' })
    .max(255, { message: 'File name cannot exceed 255 characters' })
    .refine((val) => !/[\\/:\*\?"<>\|]/.test(val), {
      message: 'File name contains invalid characters'
    }),
  mimeType: z.string().trim().min(1, { message: 'MIME type is required' }),
  sizeBytes: z
    .number()
    .int()
    .positive({ message: 'File size must be greater than 0 bytes' })
    .max(MAX_FILE_SIZE_BYTES, { message: 'File size exceeds maximum allowed limit (500 MB)' }),
  folderId: z.string().uuid().nullable().optional()
});

export const completeUploadSchema = z.object({
  fileId: z.string().min(1, { message: 'File ID is required' }),
  checksum: z.string().optional(),
  actualSizeBytes: z.number().int().positive().optional()
});

export const listFilesQuerySchema = z.object({
  folderId: z.string().optional(),
  status: z.enum(['uploading', 'ready', 'failed']).optional().default('ready'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export const updateFileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'File name is required' })
    .max(255, { message: 'File name cannot exceed 255 characters' })
    .refine((val) => !/[\\/:\*\?"<>\|]/.test(val), {
      message: 'File name contains invalid characters'
    })
    .optional(),
  folderId: z.string().nullable().optional()
});

export type InitUploadInput = z.infer<typeof initUploadSchema>;
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;
export type UpdateFileInput = z.infer<typeof updateFileSchema>;
export type ListFilesQueryInput = z.infer<typeof listFilesQuerySchema>;
