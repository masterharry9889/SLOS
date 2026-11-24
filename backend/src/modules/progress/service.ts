import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma.js';
import { AppError } from '@/lib/errors.js';

export async function createProgressEvent(userId: string, input: {
  type: string; topicId?: string; topic_id?: string; durationMin?: number;
  duration_minutes?: number; metadata?: Record<string, unknown>;
}) {
  const topicId = input.topicId ?? input.topic_id;
  if (topicId) {
    const topic = await prisma.topic.findFirst({
      where: { id: topicId, subject: { userId } },
      select: { id: true },
    });
    if (!topic) throw new AppError(404, 'NOT_FOUND', 'Topic not found');
  }
  const event = await prisma.progressEvent.create({
    data: {
      userId,
      type: input.type,
      ...(topicId ? { topicId } : {}),
      durationMin: input.durationMin ?? input.duration_minutes,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
  if (topicId && (input.type === 'studied' || input.type === 'revised')) {
    await prisma.topic.update({ where: { id: topicId }, data: { status: input.type } });
  }
  return event;
}

export async function getDashboard(userId: string) {
  const [subjects, events, attempts, noteCount, quizCount] = await Promise.all([
    prisma.subject.findMany({
      where: { userId },
      include: { topics: { select: { id: true, status: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.progressEvent.findMany({
      where: { userId, createdAt: { gte: new Date(Date.now() - 90 * 86_400_000) } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.attempt.findMany({
      where: { userId, status: 'graded' },
      include: { quiz: { select: { title: true, quizTopics: { include: { topic: true } } } } },
      orderBy: { gradedAt: 'desc' },
      take: 100,
    }),
    prisma.note.count({ where: { userId, isLatest: true } }),
    prisma.progressEvent.count({ where: { userId, type: 'quiz_taken' } }),
  ]);
  const dayKeys = new Set(events.map((event) => event.createdAt.toISOString().slice(0, 10)));
  let streak = 0;
  const today = new Date();
  for (let offset = 0; offset < 366; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    if (!dayKeys.has(key) && offset === 0) continue;
    if (!dayKeys.has(key)) break;
    streak += 1;
  }

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekly = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      minutes: events.filter((event) =>
        event.createdAt.toISOString().slice(0, 10) === key,
      ).reduce((sum, event) => sum + (event.durationMin ?? 0), 0),
    };
  });

  const quizScoreTrend = attempts.slice(0, 12).reverse().map((attempt) => ({
    date: (attempt.gradedAt ?? attempt.submittedAt ?? attempt.startedAt).toISOString(),
    score: attempt.maxScore ? Math.round(((attempt.score ?? 0) / attempt.maxScore) * 100) : 0,
    quiz_title: attempt.quiz.title,
  }));
  const topicScores = new Map<string, { topic_title: string; subject_title: string; subject_id: string; score: number; total: number }>();
  for (const attempt of attempts) {
    const percentage = attempt.maxScore ? (attempt.score ?? 0) / attempt.maxScore * 100 : 0;
    for (const { topic } of attempt.quiz.quizTopics) {
      const current = topicScores.get(topic.id) ?? {
        topic_title: topic.title,
        subject_title: subjects.find((subject) => subject.id === topic.subjectId)?.title ?? '',
        subject_id: topic.subjectId,
        score: 0,
        total: 0,
      };
      current.score += percentage;
      current.total += 1;
      topicScores.set(topic.id, current);
    }
  }
  const weakTopics = Array.from(topicScores.entries())
    .map(([topic_id, value]) => ({
      topic_id,
      topic_title: value.topic_title,
      subject_title: value.subject_title,
      subject_id: value.subject_id,
      score_percentage: Math.round(value.score / value.total),
    }))
    .sort((a, b) => a.score_percentage - b.score_percentage)
    .slice(0, 5);

  return {
    subjects: subjects.map((subject) => ({
      ...subject,
      user_id: subject.userId,
      exam_date: subject.examDate,
      created_at: subject.createdAt,
      updated_at: subject.updatedAt,
      total_topics: subject.topics.length,
      completed_topics: subject.topics.filter((topic) => ['studied', 'revised', 'tested'].includes(topic.status)).length,
    })),
    study_streak: streak,
    weekly_study_minutes: weekly,
    quiz_score_trend: quizScoreTrend,
    weak_topics: weakTopics,
    total_study_hours: Math.round(events.reduce((sum, event) => sum + (event.durationMin ?? 0), 0) / 60 * 10) / 10,
    total_notes_generated: noteCount,
    total_quizzes_taken: quizCount,
  };
}

export async function logStudySession(userId: string, input: {
  chapter_id: string; subject_id: string; duration_seconds: number;
}) {
  const topic = await prisma.topic.findFirst({
    where: { id: input.chapter_id, subjectId: input.subject_id, subject: { userId } },
    select: { id: true },
  });
  if (!topic) throw new AppError(404, 'NOT_FOUND', 'Chapter not found');
  return prisma.progressEvent.create({
    data: {
      userId,
      topicId: topic.id,
      type: 'study_session',
      durationMin: Math.max(1, Math.round(input.duration_seconds / 60)),
      metadata: { durationSeconds: input.duration_seconds },
    },
  });
}
