import { prisma } from '@/lib/prisma.js';
import { AppError } from '@/lib/errors.js';
import type { CreateQuizSchema } from './schemas.js';

type CreateQuizInput = typeof CreateQuizSchema._output;

export async function listQuizzes(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId }, select: { id: true } });
  if (!subject) throw new AppError(404, 'NOT_FOUND', 'Subject not found');
  return prisma.quiz.findMany({
    where: { userId, subjectId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getQuiz(userId: string, quizId: string) {
  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, userId } });
  if (!quiz) throw new AppError(404, 'NOT_FOUND', 'Quiz not found');
  return quiz;
}

export async function createQuiz(userId: string, input: CreateQuizInput) {
  const subjectId = input.subjectId ?? input.subject_id!;
  const topicIds = input.topicIds ?? input.topic_ids ?? [];
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId }, select: { id: true } });
  if (!subject) throw new AppError(404, 'NOT_FOUND', 'Subject not found');
  if (topicIds.length) {
    const topics = await prisma.topic.findMany({ where: { id: { in: topicIds }, subjectId }, select: { id: true } });
    if (topics.length !== new Set(topicIds).size) throw new AppError(404, 'NOT_FOUND', 'One or more topics were not found');
  }
  return prisma.quiz.create({
    data: {
      userId,
      subjectId,
      title: input.title,
      questions: input.questions as object[],
      ...(topicIds.length ? { quizTopics: { create: topicIds.map((topicId) => ({ topicId })) } } : {}),
    },
  });
}

export async function startAttempt(userId: string, quizId: string) {
  const quiz = await getQuiz(userId, quizId);
  const attempt = await prisma.attempt.create({
    data: { userId, quizId, status: 'in_progress' },
  });
  return { attempt_id: attempt.id, quiz, started_at: attempt.startedAt };
}
