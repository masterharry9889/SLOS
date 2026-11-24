import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma.js';
import { AppError } from '@/lib/errors.js';
import { enqueueJob } from '@/lib/queue.js';

async function createGenerationJob(
  userId: string,
  subjectId: string,
  type: 'generate_cheatsheet' | 'generate_paper',
  payload: Record<string, unknown>,
) {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) throw new AppError(404, 'NOT_FOUND', 'Subject not found');
  const job = await prisma.job.create({
    data: { userId, type, status: 'queued', resourceType: 'artifact', payload: payload as Prisma.InputJsonValue },
  });
  try {
    await enqueueJob({ jobId: job.id, userId, type, payload });
  } catch {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: 'failed', error: 'Artifact generation could not be queued', completedAt: new Date() },
    });
    throw new AppError(503, 'JOB_QUEUE_UNAVAILABLE', 'Artifact generation could not be queued');
  }
  return { job_id: job.id, status: job.status };
}

export function enqueueCheatsheet(userId: string, input: {
  subject_id: string; scope: string; scope_id: string; format: string;
}) {
  return createGenerationJob(userId, input.subject_id, 'generate_cheatsheet', input);
}

export async function enqueuePaper(userId: string, input: {
  subject_id: string; chapter_ids: string[]; total_marks: number; duration_minutes: number;
  difficulty_mix: { easy: number; medium: number; hard: number };
  question_types: { type: string; count: number; marks_each: number }[];
  past_paper_document_id?: string;
}) {
  const topics = await prisma.topic.findMany({
    where: { id: { in: input.chapter_ids }, subjectId: input.subject_id, subject: { userId } },
    select: { id: true },
  });
  if (topics.length !== new Set(input.chapter_ids).size) {
    throw new AppError(404, 'NOT_FOUND', 'One or more chapters were not found');
  }
  return createGenerationJob(userId, input.subject_id, 'generate_paper', input);
}

export async function listArtifacts(userId: string, query: { subject_id?: string; type?: string }) {
  if (query.subject_id) {
    const subject = await prisma.subject.findFirst({ where: { id: query.subject_id, userId }, select: { id: true } });
    if (!subject) throw new AppError(404, 'NOT_FOUND', 'Subject not found');
  }
  return prisma.artifact.findMany({
    where: {
      userId,
      ...(query.subject_id ? { subjectId: query.subject_id } : {}),
      ...(query.type ? { type: query.type } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getArtifact(userId: string, artifactId: string) {
  const artifact = await prisma.artifact.findFirst({ where: { id: artifactId, userId } });
  if (!artifact) throw new AppError(404, 'NOT_FOUND', 'Artifact not found');
  return artifact;
}
