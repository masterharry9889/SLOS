import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma.js';
import { AppError } from '@/lib/errors.js';
import { emitJobUpdate } from '@/lib/jobEvents.js';
import type { AgentCallbackInput } from './schemas.js';

export async function getJobForUser(userId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
  });

  if (!job) {
    throw new AppError(404, 'NOT_FOUND', 'Job not found');
  }

  return job;
}

export async function finalizeJobFromCallback(input: AgentCallbackInput) {
  const job = await prisma.job.findUnique({
    where: { id: input.job_id },
  });

  if (!job) {
    throw new AppError(404, 'JOB_NOT_FOUND', 'Job not found');
  }

  if (job.status === 'completed' || job.status === 'failed') {
    emitJobUpdate(job.id, {
      jobId: job.id,
      status: job.status,
      result: job.result ?? undefined,
      error: job.error ?? null,
    });
    return { id: job.id, status: job.status, idempotent: true };
  }

  const finalStatus = input.status === 'completed' ? 'completed' : 'failed';
  const updated = await prisma.$transaction(async (transaction) => {
    const claimed = await transaction.job.updateMany({
      where: { id: job.id, status: { notIn: ['completed', 'failed'] } },
      data: {
        status: finalStatus,
        result: (input.result ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        error: input.error ?? null,
        completedAt: new Date(),
      },
    });

    if (claimed.count === 0) {
      const current = await transaction.job.findUniqueOrThrow({ where: { id: job.id } });
      return { job: current, idempotent: true };
    }

    const payload = (job.payload ?? {}) as Record<string, unknown>;
    const result = input.result && typeof input.result === 'object'
      ? input.result as Record<string, unknown>
      : {};

    if (finalStatus === 'failed') {
      if (job.type === 'parse' && typeof payload.documentId === 'string') {
        await transaction.document.updateMany({
          where: { id: payload.documentId, userId: job.userId },
          data: { status: 'error' },
        });
      }
    } else if (job.type === 'parse') {
      const documentId = typeof result.document_id === 'string'
        ? result.document_id
        : typeof result.documentId === 'string'
          ? result.documentId
          : typeof payload.documentId === 'string'
            ? payload.documentId
            : undefined;
      const topicTree = result.topicTree ?? result.tree;
      if (!documentId || !topicTree || typeof topicTree !== 'object') {
        throw new AppError(422, 'INVALID_AGENT_RESULT', 'Document parser returned an invalid topic tree');
      }
      const tree = topicTree as { units?: Array<{
        title?: string;
        chapters?: Array<{ title?: string; concepts?: Array<string | { title?: string }>; source_spans?: unknown }>;
      }> };
      if (!Array.isArray(tree.units)) {
        throw new AppError(422, 'INVALID_AGENT_RESULT', 'Document parser returned an invalid topic tree');
      }

      const document = await transaction.document.findFirst({
        where: { id: documentId, userId: job.userId },
        select: { id: true, subjectId: true },
      });
      if (!document) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document for parse job was not found');
      for (const [unitIndex, unit] of tree.units.entries()) {
        if (!unit.title) continue;
        const savedUnit = await transaction.topic.create({
          data: { subjectId: document.subjectId, title: unit.title, level: 'unit', order: unitIndex },
        });
        for (const [chapterIndex, chapter] of (unit.chapters ?? []).entries()) {
          if (!chapter.title) continue;
          const savedChapter = await transaction.topic.create({
            data: {
              subjectId: document.subjectId,
              title: chapter.title,
              level: 'chapter',
              parentId: savedUnit.id,
              order: chapterIndex,
              sourceSpans: (chapter.source_spans ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            },
          });
          for (const [conceptIndex, concept] of (chapter.concepts ?? []).entries()) {
            const title = typeof concept === 'string' ? concept : concept.title;
            if (!title) continue;
            await transaction.topic.create({
              data: {
                subjectId: document.subjectId,
                title,
                level: 'concept',
                parentId: savedChapter.id,
                order: conceptIndex,
              },
            });
          }
        }
      }
      await transaction.document.update({
        where: { id: document.id },
        data: { status: 'parsed', topicTree: topicTree as Prisma.InputJsonValue },
      });
    } else if (job.type === 'generate_notes') {
      const topicId = typeof result.topic_id === 'string'
        ? result.topic_id
        : typeof payload.chapter_id === 'string'
          ? payload.chapter_id
          : undefined;
      if (!topicId || typeof result.content !== 'string' || !result.content.trim()) {
        throw new AppError(422, 'INVALID_AGENT_RESULT', 'Notes agent returned invalid content');
      }
      const topic = await transaction.topic.findFirst({
        where: { id: topicId, subject: { userId: job.userId } },
        select: { id: true },
      });
      if (!topic) throw new AppError(404, 'TOPIC_NOT_FOUND', 'Chapter for note job was not found');
      const latest = await transaction.note.findFirst({
        where: { topicId, userId: job.userId },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      await transaction.note.updateMany({
        where: { topicId, userId: job.userId, isLatest: true },
        data: { isLatest: false },
      });
      await transaction.note.create({
        data: {
          userId: job.userId,
          topicId,
          content: result.content,
          version: (latest?.version ?? 0) + 1,
          depth: typeof result.depth === 'string' ? result.depth : null,
          mode: typeof result.mode === 'string' ? result.mode : null,
          isLatest: true,
        },
      });
    } else if (job.type === 'generate_cheatsheet' || job.type === 'generate_paper') {
      if (typeof result.content !== 'string' || !result.content.trim()) {
        throw new AppError(422, 'INVALID_AGENT_RESULT', 'Artifact agent returned invalid content');
      }
      const subjectId = typeof payload.subject_id === 'string' ? payload.subject_id : undefined;
      const scopeId = typeof payload.scope_id === 'string' ? payload.scope_id : undefined;
      const metadata = result.metadata && typeof result.metadata === 'object' && !Array.isArray(result.metadata)
        ? result.metadata as Record<string, unknown>
        : {};
      const artifact = await transaction.artifact.create({
        data: {
          userId: job.userId,
          subjectId,
          topicId: payload.scope === 'subject' ? undefined : scopeId,
          type: job.type === 'generate_paper' ? 'question_paper' : 'cheatsheet',
          title: typeof result.title === 'string' ? result.title : 'Generated study artifact',
          content: result.content,
          metadata: {
            ...metadata,
            ...(job.type === 'generate_paper' ? {
              total_marks: payload.total_marks,
              duration_minutes: payload.duration_minutes,
            } : {}),
          } as Prisma.InputJsonValue,
          scope: typeof result.scope === 'string' ? result.scope : String(payload.scope ?? 'subject'),
        },
      });
      if (job.type === 'generate_paper') {
        await transaction.job.update({
          where: { id: job.id },
          data: { result: { ...result, artifact_id: artifact.id } as Prisma.InputJsonValue },
        });
      }
    } else if (job.type === 'evaluate') {
      const attemptId = typeof payload.attempt_id === 'string' ? payload.attempt_id : undefined;
      if (!attemptId || typeof result.score !== 'number' || typeof result.max_score !== 'number') {
        throw new AppError(422, 'INVALID_AGENT_RESULT', 'Assessment agent returned invalid grading results');
      }
      const attemptUpdate = await transaction.attempt.updateMany({
        where: { id: attemptId, userId: job.userId },
        data: {
          status: 'graded',
          score: result.score,
          maxScore: result.max_score,
          feedback: (result.feedback ?? []) as Prisma.InputJsonValue,
          gradedAt: new Date(),
        },
      });
      if (!attemptUpdate.count) throw new AppError(404, 'ATTEMPT_NOT_FOUND', 'Attempt for grading job was not found');
      const event = await transaction.progressEvent.findFirst({
        where: { userId: job.userId, type: 'quiz_taken', metadata: { path: ['attemptId'], equals: attemptId } },
      });
      if (event) {
        const metadata = event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata)
          ? event.metadata as Record<string, Prisma.JsonValue>
          : {};
        await transaction.progressEvent.update({
          where: { id: event.id },
          data: {
            metadata: {
              ...metadata,
              score: result.score,
              maxScore: result.max_score,
            },
          },
        });
      }
    }

    return {
      job: await transaction.job.findUniqueOrThrow({ where: { id: job.id } }),
      idempotent: false,
    };
  });

  emitJobUpdate(updated.job.id, {
    jobId: updated.job.id,
    status: updated.job.status,
    result: updated.job.result ?? undefined,
    error: updated.job.error ?? null,
  });

  return { id: updated.job.id, status: updated.job.status, idempotent: updated.idempotent };
}
