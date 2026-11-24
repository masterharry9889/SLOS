import { z } from 'zod';

export const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024;

export const SupportedMimeTypes = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
} as const;

const fileSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive().max(MAX_DOCUMENT_SIZE_BYTES),
  mimeType: z.enum([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
  ]),
  subjectId: z.string().min(1),
});

export const UploadUrlSchema = fileSchema;

export const CreateDocumentSchema = fileSchema.extend({
  fileKey: z.string().min(1).max(1_024),
  sourceType: z.enum(['syllabus', 'content']),
});

export const DocumentIdParamsSchema = z.object({ id: z.string().min(1) });
export const SubjectIdParamsSchema = z.object({ subjectId: z.string().min(1) });

export type UploadUrlInput = z.infer<typeof UploadUrlSchema>;
export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;
