import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma.js';
import { AppError } from '@/lib/errors.js';
import { config } from '@/config.js';
import { enqueueJob } from '@/lib/queue.js';
import {
  createDownloadUrl,
  createUploadUrl,
  getObjectMetadata,
  getObjectPrefix,
} from '@/lib/storage.js';
import {
  MAX_DOCUMENT_SIZE_BYTES,
  SupportedMimeTypes,
  type CreateDocumentInput,
  type UploadUrlInput,
} from './schemas.js';

function safeExtension(fileName: string): string {
  return fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
}

function validFileExtension(fileName: string, mimeType: keyof typeof SupportedMimeTypes): boolean {
  return (SupportedMimeTypes[mimeType] as readonly string[]).includes(safeExtension(fileName));
}

function hasExpectedSignature(mimeType: keyof typeof SupportedMimeTypes, prefix: Uint8Array): boolean {
  const startsWith = (...bytes: number[]) => bytes.every((byte, index) => prefix[index] === byte);

  switch (mimeType) {
    case 'application/pdf':
      return new TextDecoder().decode(prefix.slice(0, 5)) === '%PDF-';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return startsWith(0x50, 0x4b, 0x03, 0x04);
    case 'image/png':
      return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case 'image/jpeg':
      return startsWith(0xff, 0xd8, 0xff);
  }
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);
}

function objectKeyForUser(userId: string, subjectId: string, fileKey: string): boolean {
  const parts = fileKey.split('/');
  return (
    parts.length === 4 &&
    parts[0] === userId &&
    parts[1] === subjectId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parts[2]) &&
    /^[a-zA-Z0-9._-]{1,255}$/.test(parts[3])
  );
}

function asStorageError(error: unknown): AppError {
  if (
    typeof error === 'object' &&
    error !== null &&
    '$metadata' in error &&
    typeof error.$metadata === 'object' &&
    error.$metadata !== null &&
    'httpStatusCode' in error.$metadata &&
    error.$metadata.httpStatusCode === 404
  ) {
    return new AppError(400, 'UPLOAD_NOT_FOUND', 'Uploaded object was not found in storage');
  }
  return new AppError(502, 'STORAGE_UNAVAILABLE', 'File storage is temporarily unavailable');
}

export async function createDocumentUploadUrl(userId: string, input: UploadUrlInput) {
  const subject = await prisma.subject.findFirst({
    where: { id: input.subjectId, userId },
    select: { id: true },
  });
  if (!subject) throw new AppError(404, 'NOT_FOUND', 'Subject not found');

  if (!validFileExtension(input.fileName, input.mimeType)) {
    throw new AppError(400, 'INVALID_FILE_TYPE', 'File extension does not match the selected file type');
  }

  const fileKey = [
    userId,
    subject.id,
    randomUUID(),
    sanitizeFileName(input.fileName),
  ].join('/');

  try {
    const uploadUrl = await createUploadUrl(fileKey, input.mimeType);
    return { uploadUrl, fileKey, expiresIn: config.PRESIGNED_URL_TTL_SECONDS };
  } catch (error) {
    throw asStorageError(error);
  }
}

export async function createDocument(userId: string, input: CreateDocumentInput) {
  if (!objectKeyForUser(userId, input.subjectId, input.fileKey)) {
    throw new AppError(400, 'INVALID_FILE_KEY', 'File key is invalid for this user or subject');
  }

  const subject = await prisma.subject.findFirst({
    where: { id: input.subjectId, userId },
    select: { id: true },
  });
  if (!subject) throw new AppError(404, 'NOT_FOUND', 'Subject not found');

  if (input.fileSize > MAX_DOCUMENT_SIZE_BYTES) {
    throw new AppError(400, 'FILE_TOO_LARGE', 'File must be 25 MB or smaller');
  }

  if (!validFileExtension(input.fileName, input.mimeType)) {
    throw new AppError(400, 'INVALID_FILE_TYPE', 'File extension does not match the selected file type');
  }

  let metadata: Awaited<ReturnType<typeof getObjectMetadata>>;
  let prefix: Uint8Array;
  try {
    metadata = await getObjectMetadata(input.fileKey);
    prefix = await getObjectPrefix(input.fileKey);
  } catch (error) {
    throw asStorageError(error);
  }

  if (metadata.contentLength === undefined || metadata.contentLength !== input.fileSize) {
    throw new AppError(400, 'FILE_SIZE_MISMATCH', 'Uploaded file size does not match the request');
  }
  if (metadata.contentLength > MAX_DOCUMENT_SIZE_BYTES) {
    throw new AppError(400, 'FILE_TOO_LARGE', 'File must be 25 MB or smaller');
  }
  if (metadata.contentType?.split(';')[0]?.trim().toLowerCase() !== input.mimeType) {
    throw new AppError(400, 'FILE_TYPE_MISMATCH', 'Uploaded file type does not match the request');
  }
  if (!hasExpectedSignature(input.mimeType, prefix)) {
    throw new AppError(400, 'FILE_CONTENT_MISMATCH', 'File content does not match the selected type');
  }

  const created = await prisma.$transaction(async (transaction) => {
    const document = await transaction.document.create({
      data: {
        userId,
        subjectId: subject.id,
        fileName: input.fileName,
        fileKey: input.fileKey,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        sourceType: input.sourceType,
        status: 'uploaded',
      },
    });

    const job = await transaction.job.create({
      data: {
        userId,
        type: 'parse',
        status: 'queued',
        resourceId: document.id,
        resourceType: 'document',
        payload: {
          documentId: document.id,
          subjectId: document.subjectId,
          fileKey: document.fileKey,
          sourceType: document.sourceType,
        },
      },
    });

    return { document, job };
  });

  try {
    await enqueueJob({
      jobId: created.job.id,
      userId,
      type: created.job.type,
      payload: {
        documentId: created.document.id,
        subjectId: created.document.subjectId,
        fileKey: created.document.fileKey,
        sourceType: created.document.sourceType,
      },
    });
  } catch {
    await prisma.$transaction([
      prisma.job.update({
        where: { id: created.job.id, userId },
        data: { status: 'failed', error: 'Document processing could not be queued' },
      }),
      prisma.document.update({
        where: { id: created.document.id, userId },
        data: { status: 'error' },
      }),
    ]);
    throw new AppError(503, 'JOB_QUEUE_UNAVAILABLE', 'Document processing could not be queued');
  }

  return created;
}

export async function getDocument(userId: string, documentId: string) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId },
  });
  if (!document) throw new AppError(404, 'NOT_FOUND', 'Document not found');

  try {
    return { ...document, downloadUrl: await createDownloadUrl(document.fileKey) };
  } catch {
    throw new AppError(502, 'STORAGE_UNAVAILABLE', 'File storage is temporarily unavailable');
  }
}

export async function listSubjectDocuments(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId },
    select: { id: true },
  });
  if (!subject) throw new AppError(404, 'NOT_FOUND', 'Subject not found');
  return prisma.document.findMany({
    where: { userId, subjectId: subject.id },
    orderBy: { createdAt: 'desc' },
  });
}
