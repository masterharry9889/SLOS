'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  Clock,
  Award,
  Layers,
  Sparkles,
  Play,
  ArrowLeft,
  AlertTriangle,
  HelpCircle,
  FileCheck2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSubject } from '@/lib/api/endpoints';
import { useQuiz } from '@/hooks/useQuiz';
import { QuizPlayer } from '@/components/features/quiz/quiz-player';
import { QuizResults } from '@/components/features/quiz/quiz-results';
import { Skeleton } from '@/components/ui/skeleton';
import type { Subject } from '@/types';

type QuizState = 'not_started' | 'in_progress' | 'completed';

export default function QuizPlayerPage() {
  const params = useParams();
  const router = useRouter();

  const subjectId = (params?.id as string) || '';
  const quizId = (params?.quizId as string) || '';

  const [quizState, setQuizState] = useState<QuizState>('not_started');

  // Fetch subject info for breadcrumbs & styling
  const { data: subject, isLoading: subjectLoading } = useQuery<Subject>({
    queryKey: ['subject', subjectId],
    queryFn: () => getSubject(subjectId),
    enabled: !!subjectId,
  });

  // Use the robust useQuiz hook
  const {
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
    startQuizSession,
    resetQuiz,
  } = useQuiz(quizId);

  // Transition to completed when result becomes available
  useEffect(() => {
    if (result && quizState !== 'completed') {
      setQuizState('completed');
    }
  }, [result, quizState]);

  // Warn before leaving page during active quiz
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (quizState === 'in_progress') {
        e.preventDefault();
        e.returnValue = 'You have an active quiz attempt in progress. Leaving will forfeit your unsaved answers.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [quizState]);

  // Compute topics covered in this quiz
  const coveredTopics = useMemo(() => {
    if (!quiz?.questions) return [];
    const set = new Set<string>();
    quiz.questions.forEach((q) => {
      if (q.topic_title) set.add(q.topic_title);
    });
    return Array.from(set);
  }, [quiz]);

  const subjectTitle = subject?.title || 'Subject';
  const quizTitle = quiz?.title || 'Knowledge Assessment Quiz';

  // Handle start
  const handleStart = async () => {
    await startQuizSession();
    setQuizState('in_progress');
  };

  // Handle retry
  const handleRetry = () => {
    resetQuiz();
    setQuizState('not_started');
  };

  // Loading state
  if (quizLoading || subjectLoading) {
    return (
      <div className="space-y-6 pb-12">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-10 w-96" />
        <div className="rounded-xl border border-border bg-card p-8 space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <div className="grid grid-cols-3 gap-4 pt-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!quiz) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-4">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <h2 className="text-lg font-bold text-foreground">Quiz Not Found</h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          The requested quiz ID could not be loaded. Please return to the subject workspace.
        </p>
        <Link
          href={`/subjects/${subjectId}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link
          href="/"
          className="hover:text-foreground transition-colors font-medium hover:underline"
        >
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        <Link
          href={`/subjects/${subjectId}`}
          className="hover:text-foreground transition-colors font-medium hover:underline truncate max-w-[200px]"
        >
          {subjectTitle}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="font-semibold text-foreground truncate max-w-[250px]">
          {quizTitle}
        </span>
      </nav>

      {/* 1. STATE: NOT STARTED */}
      {quizState === 'not_started' && (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border/80 pb-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: subject?.color || 'hsl(var(--primary))' }}
                  />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {subjectTitle}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  {quizTitle}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Timed topic quiz with instant automated grading and concept breakdowns
                </p>
              </div>

              <Link
                href={`/subjects/${subjectId}`}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Cancel
              </Link>
            </div>

            {/* Assessment Meta Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <FileCheck2 className="mx-auto h-5 w-5 text-primary mb-1" />
                <span className="text-lg font-black text-foreground block">
                  {quiz.questions?.length || 0}
                </span>
                <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                  Questions
                </span>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <Award className="mx-auto h-5 w-5 text-primary mb-1" />
                <span className="text-lg font-black text-foreground block">
                  {quiz.total_marks || 0}
                </span>
                <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                  Total Marks
                </span>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <Clock className="mx-auto h-5 w-5 text-primary mb-1" />
                <span className="text-lg font-black text-foreground block">
                  {quiz.duration_minutes || 15}
                </span>
                <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                  Minutes
                </span>
              </div>
            </div>

            {/* Topics Covered */}
            {coveredTopics.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Topics Evaluated in this Quiz
                </h3>
                <div className="flex flex-wrap gap-2">
                  {coveredTopics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg border border-border/80 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quiz Rules & Instructions */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-2 text-foreground/90">
              <h4 className="font-bold flex items-center gap-1.5 text-primary">
                <Sparkles className="h-4 w-4" />
                Quiz Guidelines:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
                <li>The countdown timer starts as soon as you click "Start Quiz".</li>
                <li>You can flag any question for later review and freely navigate backwards.</li>
                <li>When the timer expires, all answered questions will automatically submit.</li>
                <li>Your responses are evaluated instantaneously against syllabus objectives.</li>
              </ul>
            </div>

            {/* Start Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStart}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                Start Quiz Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. STATE: IN PROGRESS */}
      {quizState === 'in_progress' && (
        <QuizPlayer
          quiz={quiz}
          currentQuestion={currentQuestion}
          currentIndex={currentIndex}
          answers={answers}
          flagged={flagged}
          timeRemaining={timeRemaining}
          isTimeUp={isTimeUp}
          isSubmitting={isSubmitting}
          onSetAnswer={setAnswer}
          onToggleFlag={toggleFlag}
          onGoToQuestion={goToQuestion}
          onNext={next}
          onPrevious={previous}
          onSubmit={submit}
        />
      )}

      {/* 3. STATE: COMPLETED */}
      {quizState === 'completed' && result && (
        <QuizResults
          quiz={quiz}
          result={result}
          subjectId={subjectId}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}
