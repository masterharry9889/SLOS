import { prisma } from '@/lib/prisma.js';
import { AppError } from '@/lib/errors.js';
import { enqueueJob } from '@/lib/queue.js';

export async function submitAttempt(userId: string, attemptId: string, answers: {
  question_id: string; answer: string; time_spent_seconds?: number;
}[]) {
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId },
    include: { quiz: true },
  });
  if (!attempt) throw new AppError(404, 'NOT_FOUND', 'Attempt not found');
  if (attempt.status !== 'in_progress') throw new AppError(409, 'ATTEMPT_ALREADY_SUBMITTED', 'Attempt has already been submitted');

  const validIds = new Set((attempt.quiz.questions as Array<{ id?: unknown }>).map((question) => question.id).filter((id): id is string => typeof id === 'string'));
  if (answers.some((answer) => !validIds.has(answer.question_id))) {
    throw new AppError(400, 'INVALID_ANSWER', 'An answer references a question outside this quiz');
  }

  const job = await prisma.$transaction(async (transaction) => {
    const updatedAttempt = await transaction.attempt.update({
      where: { id: attempt.id },
      data: {
        answers: answers as object[],
        status: 'submitted',
        submittedAt: new Date(),
      },
    });
    const createdJob = await transaction.job.create({
      data: {
        userId,
        type: 'evaluate',
        status: 'queued',
        resourceId: attempt.id,
        resourceType: 'attempt',
        payload: {
          attempt_id: attempt.id,
          typed_answers: Object.fromEntries(answers.map((answer) => [answer.question_id, answer.answer])),
          questions: attempt.quiz.questions,
        },
      },
    });
    await transaction.progressEvent.create({
      data: {
        userId,
        type: 'quiz_taken',
        metadata: { quizId: attempt.quizId, attemptId: attempt.id },
      },
    });
    return { updatedAttempt, createdJob };
  });

  try {
    await enqueueJob({
      jobId: job.createdJob.id,
      userId,
      type: job.createdJob.type,
      payload: job.createdJob.payload as Record<string, unknown>,
    });
  } catch {
    await prisma.$transaction([
      prisma.job.update({
        where: { id: job.createdJob.id },
        data: { status: 'failed', error: 'Attempt grading could not be queued', completedAt: new Date() },
      }),
      prisma.attempt.update({
        where: { id: attempt.id },
        data: { status: 'submitted' },
      }),
    ]);
    throw new AppError(503, 'JOB_QUEUE_UNAVAILABLE', 'Attempt grading could not be queued');
  }

  return { job_id: job.createdJob.id, attempt_id: attempt.id };
}

export async function getAttemptResult(userId: string, attemptId: string) {
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId },
    include: { quiz: { include: { quizTopics: { include: { topic: true } } } } },
  });
  if (!attempt) throw new AppError(404, 'NOT_FOUND', 'Attempt not found');
  if (attempt.status !== 'graded') throw new AppError(409, 'RESULT_NOT_READY', 'Attempt has not been graded yet');

  const answers = (attempt.answers ?? []) as Array<{ question_id: string; answer: string; time_spent_seconds?: number }>;
  const feedback = (attempt.feedback ?? []) as Array<{
    question_id?: string;
    explanation?: string;
    topic_id?: string;
    score?: number;
    max_score?: number;
    missing_points?: string[];
  }>;
  const questions = attempt.quiz.questions as Array<Record<string, unknown> & { id: string; topic_id?: string; topic_title?: string }>;
  const feedbackByQuestionId = new Map(feedback.flatMap((item) =>
    item.question_id ? [[item.question_id, item] as const] : [],
  ));
  const explanations = Object.fromEntries(feedback.flatMap((item) =>
    item.question_id && item.explanation ? [[item.question_id, item.explanation]] : [],
  ));
  const questionResults = questions.map((question) => {
    const item = feedbackByQuestionId.get(question.id);
    const maxScore = typeof item?.max_score === 'number'
      ? item.max_score
      : typeof question.marks === 'number' ? question.marks : 1;
    const score = typeof item?.score === 'number' ? item.score : 0;
    const answerKey = question.answer_key ?? question.correct_answer ?? question.answer;
    return {
      question_id: question.id,
      score,
      max_score: maxScore,
      is_correct: score >= maxScore,
      correct_answer: typeof answerKey === 'string' ? answerKey : undefined,
      explanation: item?.explanation ?? '',
      missing_points: item?.missing_points ?? [],
      topic_id: question.topic_id,
      topic_title: question.topic_title,
    };
  });
  const topicStats = new Map<string, { title: string; score: number; total: number }>();
  for (const [index, question] of questions.entries()) {
    const topicId = question.topic_id ?? 'unassigned';
    const stats = topicStats.get(topicId) ?? {
      title: question.topic_title ?? 'General',
      score: 0,
      total: 0,
    };
    stats.score += questionResults[index]?.score ?? 0;
    stats.total += questionResults[index]?.max_score ?? 0;
    topicStats.set(topicId, stats);
  }
  const topicBreakdown = [...topicStats.entries()].map(([topicId, stats]) => ({
    topic_id: topicId,
    topic_title: stats.title,
    correct: stats.score,
    total: stats.total,
    percentage: stats.total > 0 ? Math.round((stats.score / stats.total) * 100) : 0,
  }));
  const score = attempt.score ?? 0;
  const total = attempt.maxScore ?? 0;
  return {
    attempt: {
      id: attempt.id,
      quiz_id: attempt.quizId,
      answers,
      score,
      total_marks: total,
      percentage: total > 0 ? Math.round((score / total) * 100) : 0,
      started_at: attempt.startedAt,
      completed_at: attempt.gradedAt ?? attempt.submittedAt,
      topic_breakdown: topicBreakdown,
    },
    explanations,
    weak_topics: topicBreakdown.filter((topic) => topic.percentage < 70),
    question_results: questionResults,
  };
}
