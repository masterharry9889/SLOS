'use client';

import React, { useState, useMemo } from 'react';
import {
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  X,
  Loader2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import type { Quiz, QuizQuestion } from '@/types';

export interface QuizPlayerProps {
  quiz: Quiz;
  currentQuestion: QuizQuestion | null;
  currentIndex: number;
  answers: Record<string, string>;
  flagged: Record<string, boolean>;
  timeRemaining: number;
  isTimeUp: boolean;
  isSubmitting: boolean;
  onSetAnswer: (questionId: string, answer: string) => void;
  onToggleFlag: (questionId: string) => void;
  onGoToQuestion: (index: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  className?: string;
}

export function QuizPlayer({
  quiz,
  currentQuestion,
  currentIndex,
  answers,
  flagged,
  timeRemaining,
  isTimeUp,
  isSubmitting,
  onSetAnswer,
  onToggleFlag,
  onGoToQuestion,
  onNext,
  onPrevious,
  onSubmit,
  className,
}: QuizPlayerProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const questions = quiz.questions || [];
  const totalQuestions = questions.length;
  const currentQ = currentQuestion || questions[currentIndex];

  // Compute status counts
  const answeredCount = useMemo(() => {
    return questions.filter((q) => answers[q.id] && answers[q.id].trim().length > 0).length;
  }, [questions, answers]);

  const unansweredCount = totalQuestions - answeredCount;

  const flaggedCount = useMemo(() => {
    return questions.filter((q) => flagged[q.id]).length;
  }, [questions, flagged]);

  // Format timer
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isUrgent = timeRemaining > 0 && timeRemaining < 300; // less than 5 min

  const isCurrentFlagged = currentQ ? !!flagged[currentQ.id] : false;
  const currentAnswer = currentQ ? answers[currentQ.id] || '' : '';

  // Render question interactive response input
  const renderQuestionInput = () => {
    if (!currentQ) return null;

    const qType = currentQ.type || 'mcq';

    if (qType === 'mcq') {
      const options = currentQ.options || [];
      return (
        <div className="space-y-3 pt-2">
          {options.map((option, idx) => {
            const letter = String.fromCharCode(65 + idx);
            // student can answer by index or exact option string
            const isSelected =
              currentAnswer === option ||
              currentAnswer === String(idx) ||
              currentAnswer === letter;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSetAnswer(currentQ.id, option)}
                className={cn(
                  'group flex w-full items-center gap-3.5 rounded-xl border p-4 text-left transition-all cursor-pointer',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
                )}
              >
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-colors',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-muted/60 text-muted-foreground group-hover:border-primary/50 group-hover:text-foreground'
                  )}
                >
                  {letter}
                </div>
                <div className="flex-1 text-sm font-medium text-foreground">
                  <MarkdownRenderer content={option} compact />
                </div>
                <div
                  className={cn(
                    'h-4 w-4 shrink-0 rounded-full border flex items-center justify-center transition-colors',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    if (qType === 'true_false') {
      const choices = ['True', 'False'];
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
          {choices.map((choice) => {
            const isSelected = currentAnswer.toLowerCase() === choice.toLowerCase();
            return (
              <button
                key={choice}
                type="button"
                onClick={() => onSetAnswer(currentQ.id, choice)}
                className={cn(
                  'flex items-center justify-center gap-2.5 rounded-xl border py-4 px-6 text-sm font-bold transition-all cursor-pointer',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40'
                    : 'border-border bg-card text-foreground hover:bg-muted hover:border-primary/40'
                )}
              >
                <span>{choice}</span>
              </button>
            );
          })}
        </div>
      );
    }

    if (qType === 'numerical') {
      return (
        <div className="space-y-2 pt-3 max-w-sm">
          <label className="text-xs font-semibold text-muted-foreground block">
            Enter numerical answer:
          </label>
          <input
            type="number"
            step="any"
            value={currentAnswer}
            onChange={(e) => onSetAnswer(currentQ.id, e.target.value)}
            placeholder="e.g. 42.5"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-mono font-bold text-foreground shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      );
    }

    // Short answer (textarea)
    return (
      <div className="space-y-2 pt-3">
        <label className="text-xs font-semibold text-muted-foreground block">
          Write your concise answer:
        </label>
        <textarea
          rows={4}
          value={currentAnswer}
          onChange={(e) => onSetAnswer(currentQ.id, e.target.value)}
          placeholder="Type your explanation or formula here..."
          className="w-full rounded-xl border border-border bg-background p-3.5 text-sm text-foreground shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Brief technical explanation required</span>
          <span>{currentAnswer.length} characters</span>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Top Bar: Progress, Timer, and Flag Button */}
      <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card/95 p-4 shadow-sm backdrop-blur-md">
        {/* Left: Question counter and topic */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-foreground">
              Question {currentIndex + 1}
            </span>
            <span className="text-xs text-muted-foreground">of {totalQuestions}</span>
            {currentQ?.marks && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {currentQ.marks} {currentQ.marks === 1 ? 'Mark' : 'Marks'}
              </span>
            )}
          </div>
          {currentQ?.topic_title && (
            <p className="text-xs text-muted-foreground truncate max-w-[240px]">
              {currentQ.topic_title}
            </p>
          )}
        </div>

        {/* Center/Right: Timer + Flag + Submit */}
        <div className="flex items-center gap-3">
          {/* Timer Display */}
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors',
              isUrgent
                ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 animate-pulse'
                : 'border-border bg-muted/50 text-foreground'
            )}
          >
            <Clock className={cn('h-4 w-4', isUrgent && 'text-rose-500')} />
            <span className="font-mono text-sm">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          {/* Flag Toggle Button */}
          {currentQ && (
            <button
              type="button"
              onClick={() => onToggleFlag(currentQ.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                isCurrentFlagged
                  ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Flag className={cn('h-3.5 w-3.5', isCurrentFlagged && 'fill-amber-500 text-amber-500')} />
              <span>{isCurrentFlagged ? 'Flagged' : 'Flag for Review'}</span>
            </button>
          )}

          {/* Submit Trigger */}
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Submit Quiz
          </button>
        </div>
      </div>

      {/* Main Grid: Question Display (Left) + Navigator (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Interactive Area */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm flex flex-col justify-between min-h-[460px]">
          {currentQ ? (
            <div className="space-y-6">
              {/* Question Statement */}
              <div className="border-b border-border/70 pb-5">
                <MarkdownRenderer content={currentQ.question} className="text-base sm:text-lg font-medium leading-relaxed" />
              </div>

              {/* Response Controls */}
              {renderQuestionInput()}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              No questions found in this quiz.
            </div>
          )}

          {/* Bottom Navigation Buttons */}
          <div className="mt-8 flex items-center justify-between border-t border-border/80 pt-4">
            <button
              type="button"
              onClick={onPrevious}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous Question
            </button>

            <span className="text-xs text-muted-foreground hidden sm:inline">
              {answeredCount} of {totalQuestions} answered
            </span>

            {currentIndex === totalQuestions - 1 ? (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
              >
                Review & Submit
                <Send className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onNext}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
              >
                Next Question
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Question Navigator Sidebar */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-5 h-fit">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Question Navigator
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Click any question to jump directly
            </p>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground border-y border-border/70 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              <span>Current</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>Flagged</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-border bg-card" />
              <span>Unanswered</span>
            </div>
          </div>

          {/* Numbered Grid */}
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = !!answers[q.id]?.trim();
              const isFlag = !!flagged[q.id];

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onGoToQuestion(idx)}
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer',
                    isCurrent
                      ? 'border-2 border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30'
                      : isFlag
                      ? 'border-2 border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-400 font-black'
                      : isAnswered
                      ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {idx + 1}
                  {isFlag && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white">
                      •
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Status summary */}
          <div className="rounded-lg bg-muted/30 p-3 space-y-1.5 text-xs border border-border/50">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Answered:</span>
              <span className="font-bold text-foreground">{answeredCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unanswered:</span>
              <span className="font-bold text-foreground">{unansweredCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Flagged:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{flaggedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal before Submit */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Submit Quiz Attempt?
              </h3>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-4 space-y-3 text-xs text-muted-foreground">
              <p>
                Are you ready to finalize and submit your responses? Once submitted, your answers will be
                graded and detailed explanations will be provided.
              </p>

              <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-2">
                <div className="flex justify-between font-semibold">
                  <span>Total Questions:</span>
                  <span className="text-foreground">{totalQuestions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Answered:
                  </span>
                  <span className="font-bold text-foreground">{answeredCount}</span>
                </div>
                {unansweredCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      Unanswered:
                    </span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {unansweredCount}
                    </span>
                  </div>
                )}
                {flaggedCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      Flagged for review:
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {flaggedCount}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-border/60">
                  <span>Time remaining:</span>
                  <span className="font-mono font-bold text-foreground">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Continue Reviewing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  onSubmit();
                }}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Submission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizPlayer;
