'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQuiz, startQuiz, submitQuiz, getQuizResult, getJob } from '@/lib/api/endpoints';
import type { Quiz, QuizQuestion, QuizAnswer, QuizResult } from '@/types';

export interface UseQuizReturn {
  quiz: Quiz | null;
  isLoading: boolean;
  currentQuestion: QuizQuestion | null;
  currentIndex: number;
  answers: Record<string, string>;
  setAnswer: (questionId: string, answer: string) => void;
  flagged: Record<string, boolean>;
  toggleFlag: (questionId: string) => void;
  goToQuestion: (index: number) => void;
  next: () => void;
  previous: () => void;
  timeRemaining: number;
  isTimeUp: boolean;
  submit: () => Promise<QuizResult | null>;
  isSubmitting: boolean;
  result: QuizResult | null;
  error: string | null;
  attemptId: string | null;
  startQuizSession: () => Promise<void>;
  resetQuiz: () => void;
  timeSpentPerQuestion: Record<string, number>;
}

export function useQuiz(quizId: string): UseQuizReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState<Record<string, number>>({});
  const lastActiveTimestampRef = useRef(0);
  const timeRemainingRef = useRef(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSubmittingRef = useRef(false);

  const { data: quiz = null, isLoading: quizLoading, error: quizError } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => getQuiz(quizId),
    enabled: Boolean(quizId),
    staleTime: 1000 * 60 * 10,
  });

  const questions = useMemo(() => quiz?.questions ?? [], [quiz]);
  const currentQuestion = questions[currentIndex] ?? null;

  const updateTimeSpentOnCurrentQuestion = useCallback(() => {
    if (!currentQuestion || !lastActiveTimestampRef.current) return;
    const now = Date.now();
    const elapsedSeconds = Math.max(1, Math.round((now - lastActiveTimestampRef.current) / 1000));
    setTimeSpentPerQuestion((previous) => ({
      ...previous,
      [currentQuestion.id]: (previous[currentQuestion.id] ?? 0) + elapsedSeconds,
    }));
    lastActiveTimestampRef.current = now;
  }, [currentQuestion]);

  const startQuizSession = useCallback(async () => {
    setError(null);
    try {
      const response = await startQuiz(quizId);
      if (!response.attempt_id) throw new Error('The backend did not create an attempt.');
      setAttemptId(response.attempt_id);
      setHasStarted(true);
      lastActiveTimestampRef.current = Date.now();
      if (quiz?.duration_minutes) {
        timeRemainingRef.current = quiz.duration_minutes * 60;
        setTimeRemaining(timeRemainingRef.current);
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Could not start this quiz.';
      setError(message);
      throw reason;
    }
  }, [quizId, quiz]);

  const isTimeUp = timeRemaining <= 0 && hasStarted && !result;

  const goToQuestion = useCallback((index: number) => {
    if (!questions.length) return;
    updateTimeSpentOnCurrentQuestion();
    setCurrentIndex(Math.max(0, Math.min(index, questions.length - 1)));
  }, [questions.length, updateTimeSpentOnCurrentQuestion]);

  const next = useCallback(() => {
    if (currentIndex < questions.length - 1) goToQuestion(currentIndex + 1);
  }, [currentIndex, questions.length, goToQuestion]);

  const previous = useCallback(() => {
    if (currentIndex > 0) goToQuestion(currentIndex - 1);
  }, [currentIndex, goToQuestion]);

  const setAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers((previousAnswers) => ({ ...previousAnswers, [questionId]: answer }));
  }, []);

  const toggleFlag = useCallback((questionId: string) => {
    setFlagged((previousFlags) => ({ ...previousFlags, [questionId]: !previousFlags[questionId] }));
  }, []);

  const submit = useCallback(async (): Promise<QuizResult | null> => {
    if (isSubmittingRef.current || !quiz) return null;
    if (!attemptId) throw new Error('Start the quiz before submitting answers.');
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    updateTimeSpentOnCurrentQuestion();

    const submittedAnswers: QuizAnswer[] = questions.map((question) => ({
      question_id: question.id,
      answer: answers[question.id] ?? '',
      time_spent_seconds: timeSpentPerQuestion[question.id] ?? 0,
    }));

    try {
      const submission = await submitQuiz(quiz.id, attemptId, submittedAnswers);
      if (!submission.job_id) throw new Error('The backend did not queue quiz grading.');

      let completed = false;
      for (let poll = 0; poll < 120; poll += 1) {
        const job = await getJob(submission.job_id);
        if (job.status === 'failed') throw new Error(job.error || 'Quiz grading failed.');
        if (job.status === 'completed') {
          completed = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (!completed) {
        throw new Error('Quiz grading is taking too long. Check the job status and try again later.');
      }

      const quizResult = await getQuizResult(quiz.id, attemptId);
      setResult(quizResult);
      return quizResult;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Quiz submission failed.';
      setError(message);
      throw reason;
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [quiz, attemptId, questions, answers, timeSpentPerQuestion, updateTimeSpentOnCurrentQuestion]);

  useEffect(() => {
    if (!hasStarted || result || isSubmitting || error) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      if (timeRemainingRef.current <= 1) {
        timeRemainingRef.current = 0;
        setTimeRemaining(0);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        void submit().catch(() => undefined);
        return;
      }
      timeRemainingRef.current -= 1;
      setTimeRemaining(timeRemainingRef.current);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    };
  }, [hasStarted, result, isSubmitting, error, submit]);

  const resetQuiz = useCallback(() => {
    setCurrentIndex(0);
    setAnswers({});
    setFlagged({});
    setResult(null);
    setError(null);
    setHasStarted(false);
    setAttemptId(null);
    setTimeSpentPerQuestion({});
    if (quiz?.duration_minutes) {
      timeRemainingRef.current = quiz.duration_minutes * 60;
      setTimeRemaining(timeRemainingRef.current);
    }
  }, [quiz]);

  return {
    quiz,
    isLoading: quizLoading,
    currentQuestion,
    currentIndex,
    answers,
    setAnswer,
    flagged,
    toggleFlag,
    goToQuestion,
    next,
    previous,
    timeRemaining,
    isTimeUp,
    submit,
    isSubmitting,
    result,
    error: error ?? (quizError instanceof Error ? quizError.message : null),
    attemptId,
    startQuizSession,
    resetQuiz,
    timeSpentPerQuestion,
  };
}

export default useQuiz;
