'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  BookOpen,
  FileText,
  Sparkles,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { cn, getDaysUntil, formatRelativeTime } from '@/lib/utils';
import type { Subject } from '@/types';

export interface SubjectCardProps {
  subject: Subject;
  onContinue?: (e: React.MouseEvent) => void;
  onNotes?: (e: React.MouseEvent) => void;
  onQuiz?: (e: React.MouseEvent) => void;
  className?: string;
  variant?: 'responsive' | 'vertical' | 'horizontal';
}

function CircularProgressRing({
  percentage,
  color,
  size = 52,
  strokeWidth = 4.5,
}: {
  percentage: number;
  color?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color || 'hsl(var(--primary))'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={isNaN(strokeDashoffset) ? circumference : strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-[11px] font-extrabold text-foreground tracking-tight">
        {percentage}%
      </span>
    </div>
  );
}

export function SubjectCard({
  subject,
  onContinue,
  onNotes,
  onQuiz,
  className,
  variant = 'responsive',
}: SubjectCardProps) {
  const router = useRouter();

  // Normalize data keys (snake_case from API & camelCase from mocks)
  const totalTopics =
    subject.total_topics ??
    (subject as unknown as { totalTopics?: number }).totalTopics ??
    1;
  const completedTopics =
    subject.completed_topics ??
    (subject as unknown as { completedTopics?: number }).completedTopics ??
    0;
  const examDate =
    subject.exam_date ??
    (subject as unknown as { examDate?: string }).examDate;
  const updatedAt =
    subject.updated_at ??
    (subject as unknown as { updatedAt?: string }).updatedAt;

  const completionPercent = totalTopics > 0
    ? Math.min(100, Math.round((completedTopics / totalTopics) * 100))
    : 0;

  const remainingTopics = Math.max(0, totalTopics - completedTopics);
  const daysUntilExam = getDaysUntil(examDate);
  const color = subject.color || '#6366F1';

  const navigateToSubject = () => {
    router.push(`/subjects/${subject.id}`);
  };

  const isHorizontalOnly = variant === 'horizontal';
  const isVerticalOnly = variant === 'vertical';

  return (
    <div
      onClick={navigateToSubject}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateToSubject();
        }
      }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer select-none',
        // Responsive behavior: horizontal layout on mobile screens, vertical on desktop
        !isHorizontalOnly &&
          !isVerticalOnly &&
          'flex flex-col sm:flex-col justify-between',
        isHorizontalOnly && 'flex flex-row items-center justify-between',
        isVerticalOnly && 'flex flex-col justify-between',
        className
      )}
    >
      {/* Colored Left Accent Border */}
      <div
        className="absolute top-0 bottom-0 left-0 w-1.5 rounded-l-2xl transition-all group-hover:w-2"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />

      <div className="pl-1.5 flex-1">
        {/* Card Header: Title + Progress Ring */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground tracking-tight group-hover:text-primary transition-colors truncate">
                {subject.title}
              </h3>
            </div>

            {subject.description ? (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {subject.description}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground italic">
                No description provided
              </p>
            )}
          </div>

          {/* SVG Circular Progress Indicator */}
          <div className="shrink-0 pt-0.5">
            <CircularProgressRing
              percentage={completionPercent}
              color={color}
            />
          </div>
        </div>

        {/* Progress Text and Breakdown Status Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>
              {completedTopics} of {totalTopics} topics completed
            </span>
          </span>

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {completedTopics} studied
            </span>
            {remainingTopics > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                {remainingTopics} left
              </span>
            )}
          </div>
        </div>

        {/* Meta details: Exam countdown & Last studied */}
        <div className="mt-3.5 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          {daysUntilExam !== null ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 font-semibold',
                daysUntilExam <= 7
                  ? 'text-rose-600 dark:text-rose-400'
                  : daysUntilExam <= 14
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-foreground'
              )}
            >
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>
                {daysUntilExam === 0
                  ? 'Exam today!'
                  : `${daysUntilExam} days until exam`}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>No exam date</span>
            </span>
          )}

          {updatedAt && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{formatRelativeTime(updatedAt)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Quick Action Buttons (Continue, Notes, Quiz) */}
      <div className="mt-4 pt-3 border-t border-border/60 pl-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onContinue) {
                onContinue(e);
              } else {
                router.push(`/subjects/${subject.id}`);
              }
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>Continue</span>
            <ArrowRight className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onNotes) {
                onNotes(e);
              } else {
                router.push(`/subjects/${subject.id}?tab=notes`);
              }
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer"
          >
            <FileText className="h-3 w-3" />
            <span className="hidden sm:inline">Notes</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onQuiz) {
                onQuiz(e);
              } else {
                router.push(`/subjects/${subject.id}?tab=quizzes`);
              }
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer"
          >
            <Sparkles className="h-3 w-3" />
            <span className="hidden sm:inline">Quiz</span>
          </button>
        </div>

        <span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all text-xs font-semibold inline-flex items-center gap-0.5">
          <span>Open</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}
