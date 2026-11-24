import { prisma } from '@/lib/prisma.js';
import { AppError } from '@/lib/errors.js';
import { deleteObject } from '@/lib/storage.js';
import type { CreateSubjectInput, UpdateSubjectInput } from './schemas.js';

export async function listSubjects(userId: string) {
  return prisma.subject.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getSubject(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId },
  });
  if (!subject) throw new AppError(404, 'NOT_FOUND', 'Subject not found');
  return subject;
}

export async function createSubject(userId: string, input: CreateSubjectInput) {
  return prisma.subject.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      examDate: input.examDate ?? null,
    },
  });
}

export async function updateSubject(
  userId: string,
  subjectId: string,
  input: UpdateSubjectInput,
) {
  const existing = await getSubject(userId, subjectId);
  return prisma.subject.update({
    where: { id: existing.id, userId },
    data: input,
  });
}

export async function deleteSubject(userId: string, subjectId: string): Promise<void> {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId },
    include: { documents: { select: { fileKey: true } } },
  });
  if (!subject) throw new AppError(404, 'NOT_FOUND', 'Subject not found');

  try {
    for (const document of subject.documents) {
      await deleteObject(document.fileKey);
    }
  } catch {
    throw new AppError(502, 'STORAGE_DELETE_FAILED', 'Subject files could not be deleted');
  }

  await prisma.subject.delete({ where: { id: subject.id, userId } });
}
