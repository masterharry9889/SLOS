import { prisma } from '@/lib/prisma.js';
import { AppError } from '@/lib/errors.js';
import { enqueueJob } from '@/lib/queue.js';

export async function listTopicNotes(userId: string, topicId: string) {
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, subject: { userId } },
    select: { id: true },
  });
  if (!topic) throw new AppError(404, 'NOT_FOUND', 'Topic not found');
  return prisma.note.findMany({
    where: { userId, topicId, isLatest: true },
    orderBy: { version: 'desc' },
  });
}

export async function listSubjectNotes(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId },
    select: { id: true },
  });
  if (!subject) throw new AppError(404, 'NOT_FOUND', 'Subject not found');
  return prisma.note.findMany({
    where: { userId, topic: { subjectId }, isLatest: true },
    include: { topic: { select: { id: true, title: true, subjectId: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getNote(userId: string, noteId: string) {
  const note = await prisma.note.findFirst({ where: { id: noteId, userId } });
  if (!note) throw new AppError(404, 'NOT_FOUND', 'Note not found');
  return note;
}

export async function enqueueNotes(userId: string, topicId: string, input: { depth: string; mode: string }) {
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, level: 'chapter', subject: { userId } },
    include: { subject: true },
  });
  if (!topic) throw new AppError(404, 'NOT_FOUND', 'Chapter not found');

  const job = await prisma.job.create({
    data: {
      userId,
      type: 'generate_notes',
      status: 'queued',
      resourceType: 'note',
      payload: {
        chapter_id: topic.id,
        subject_context: `${topic.subject.title}: ${topic.title}`,
        depth: input.depth,
        mode: input.mode,
      },
    },
  });
  try {
    await enqueueJob({
      jobId: job.id,
      userId,
      type: job.type,
      payload: job.payload as Record<string, unknown>,
    });
  } catch {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: 'failed', error: 'Note generation could not be queued', completedAt: new Date() },
    });
    throw new AppError(503, 'JOB_QUEUE_UNAVAILABLE', 'Note generation could not be queued');
  }
  return { job_id: job.id, status: job.status };
}

export async function createNoteVersion(userId: string, noteId: string, content: string) {
  const note = await getNote(userId, noteId);
  return prisma.$transaction(async (transaction) => {
    await transaction.note.updateMany({
      where: { userId, topicId: note.topicId, isLatest: true },
      data: { isLatest: false },
    });
    return transaction.note.create({
      data: {
        userId,
        topicId: note.topicId,
        content,
        version: note.version + 1,
        depth: note.depth,
        mode: 'manual',
        isLatest: true,
      },
    });
  });
}
