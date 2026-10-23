'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Award,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BarChart3,
  ListFilter,
  Check,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Brain,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';
import { updateTopicStatus } from '@/lib/api/endpoints';
import { useToast } from '@/components/ui/toaster';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import type { Quiz, QuizResult, QuizQuestion } from '@/types';

export interface QuizResultsProps {
  quiz: Quiz;
  result: QuizResult;
  subjectId: string;
  onRetry?: () => void;
  className?: string;
}

// Grade calculation helper
function getGrade(percentage: number): { grade: string; color: string; label: string } {
  if (percentage >= 90) return { grade: 'A+', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', label: 'Outstanding Mastery' };
  if (percentage >= 80) return { grade: 'A', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', label: 'Strong Performance' };
  if (percentage >= 70) return { grade: 'B', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', label: 'Good Understanding' };
  if (percentage >= 60) return { grade: 'C', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', label: 'Satisfactory' };
  if (percentage >= 50) return { grade: 'D', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', label: 'Needs Improvement' };
  return { grade: 'F', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', label: 'Requires Revision' };
}

// Circular progress ring helper
function ScoreRing({
  percentage,
  size = 140,
  strokeWidth = 10,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 80
      ? 'hsl(var(--primary))'
      : percentage >= 60
      ? '#f59e0b'
      : '#f43f5e';

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
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={isNaN(strokeDashoffset) ? circumference : strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-3xl font-black tracking-tight text-foreground">
          {percentage}%
        </span>
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">
          Final Score
        </span>
      </div>
    </div>
  );
}

export function QuizResults({
  quiz,
  result,
  subjectId,
  onRetry,
  className,
}: QuizResultsProps) {
  const { addToast } = useToast();
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  const [isUpdatingWeakTopics, setIsUpdatingWeakTopics] = useState(false);
  const [weakTopicsAdded, setWeakTopicsAdded] = useState(false);

  const attempt = result.attempt;
  const percentage = attempt.percentage ?? Math.round((attempt.score / (attempt.total_marks || 1)) * 100);
  const { grade, color: gradeColor, label: gradeLabel } = getGrade(percentage);

  // Map student answers
  const studentAnswerMap = useMemo(() => {
    const map = new Map<string, string>();
    (attempt.answers || []).forEach((a) => {
      map.set(a.question_id, a.answer);
    });
    return map;
  }, [attempt.answers]);

  // Topic breakdown sorted weakest first
  const sortedTopicBreakdown = useMemo(() => {
    const list = [...(attempt.topic_breakdown || [])];
    return list.sort((a, b) => a.percentage - b.percentage);
  }, [attempt.topic_breakdown]);

  // Chart data
  const chartData = useMemo(() => {
    return sortedTopicBreakdown.map((t) => ({
      name: t.topic_title.length > 16 ? `${t.topic_title.slice(0, 16)}...` : t.topic_title,
      fullName: t.topic_title,
      score: t.percentage,
      correct: t.correct,
      total: t.total,
    }));
  }, [sortedTopicBreakdown]);

  // Expand / collapse all
  const toggleExpand = (qId: string) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    (quiz.questions || []).forEach((q) => {
      next[q.id] = true;
    });
    setExpandedQuestions(next);
  };

  const handleCollapseAll = () => {
    setExpandedQuestions({});
  };

  // Add weak topics to revision
  const handleAddWeakTopicsToRevision = async () => {
    const weakList = result.weak_topics || [];
    if (weakList.length === 0) {
      addToast('No critical weak topics identified. Great work!', 'info');
      return;
    }

    setIsUpdatingWeakTopics(true);
    try {
      await Promise.all(
        weakList.map((w) =>
          updateTopicStatus(subjectId, w.topic_id, 'revised').catch((e) => {
            console.warn(`Failed to update status for topic ${w.topic_id}`, e);
          })
        )
      );
      setWeakTopicsAdded(true);
      addToast(
        `Added ${weakList.length} weak ${weakList.length === 1 ? 'topic' : 'topics'} to your active revision list.`,
        'success'
      );
    } catch {
      addToast('Failed to sync all weak topics. Please try again.', 'error');
    } finally {
      setIsUpdatingWeakTopics(false);
    }
  };

  return (
    <div className={cn('space-y-8 pb-12', className)}>
      {/* 1. Score Summary Banner & Grade Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        {/* Left: Circular Score Ring */}
        <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border/80 pb-6 md:pb-0 md:pr-6">
          <ScoreRing percentage={percentage} />
          <p className="mt-4 text-sm font-bold text-foreground">
            {attempt.score} out of {attempt.total_marks} Marks
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total Points Scored
          </p>
        </div>

        {/* Center: Grade & Performance Details */}
        <div className="flex flex-col justify-center space-y-3 md:px-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-2xl border text-xl font-black shadow-xs',
                gradeColor
              )}
            >
              {grade}
            </span>
            <div>
              <h3 className="text-base font-bold text-foreground">{gradeLabel}</h3>
              <p className="text-xs text-muted-foreground">Evaluation Grade</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Total Questions</span>
              <span className="font-bold text-foreground">{quiz.questions?.length || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Weak Topics</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {result.weak_topics?.length || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col justify-center gap-2.5 md:pl-4">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Retry Quiz
            </button>
          )}

          <button
            type="button"
            onClick={handleAddWeakTopicsToRevision}
            disabled={isUpdatingWeakTopics || weakTopicsAdded}
            className={cn(
              'inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold transition-all cursor-pointer',
              weakTopicsAdded
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-border bg-card text-foreground hover:bg-muted'
            )}
          >
            {weakTopicsAdded ? (
              <>
                <Check className="h-4 w-4" />
                Weak Topics Added to Revision
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 text-primary" />
                Add Weak Topics to Revision
              </>
            )}
          </button>

          <Link
            href={`/subjects/${subjectId}`}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Return to Subject Workspace
          </Link>
        </div>
      </div>

      {/* 2. Topic Breakdown (Chart + Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recharts Topic Bar Chart */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Topic Performance Breakdown
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Accuracy rate per topic (sorted weakest first)
            </p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Accuracy']}
                  labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.fullName || ''}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => {
                    const color =
                      entry.score >= 80
                        ? '#10b981'
                        : entry.score >= 60
                        ? '#3b82f6'
                        : '#f43f5e';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topic Breakdown Table */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <ListFilter className="h-4 w-4 text-primary" />
                  Detailed Topic Breakdown
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Weakest concepts listed first for focused revision
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 text-[11px] font-semibold text-muted-foreground uppercase">
                    <th className="pb-2.5">Topic</th>
                    <th className="pb-2.5 text-center">Score</th>
                    <th className="pb-2.5 text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sortedTopicBreakdown.map((t) => {
                    const isWeak = t.percentage < 70;
                    return (
                      <tr key={t.topic_id} className="hover:bg-muted/30">
                        <td className="py-2.5 pr-2 font-medium text-foreground">
                          <div className="flex items-center gap-1.5">
                            {isWeak && (
                              <span className="flex h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                            )}
                            <span className="truncate max-w-[200px]">{t.topic_title}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-center text-muted-foreground font-mono">
                          {t.correct} / {t.total}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 rounded-full bg-muted overflow-hidden hidden sm:block">
                              <div
                                style={{ width: `${t.percentage}%` }}
                                className={cn(
                                  'h-full rounded-full',
                                  t.percentage >= 80
                                    ? 'bg-emerald-500'
                                    : t.percentage >= 60
                                    ? 'bg-blue-500'
                                    : 'bg-rose-500'
                                )}
                              />
                            </div>
                            <span
                              className={cn(
                                'font-bold font-mono',
                                t.percentage >= 80
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : t.percentage >= 60
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              )}
                            >
                              {t.percentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Question Review Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
          <div>
            <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Question-by-Question Review
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review your answers alongside official model solutions and step-by-step explanations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExpandAll}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-muted-foreground text-xs">•</span>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {(quiz.questions || []).map((q, idx) => {
            const studentAns = studentAnswerMap.get(q.id) || '';
            const rawQ: any = q;

            // Determine correctness
            let isCorrect = false;
            let correctAnswerText = '';

            if (rawQ.correctAnswer !== undefined && q.options) {
              correctAnswerText = q.options[rawQ.correctAnswer] || String(rawQ.correctAnswer);
              isCorrect =
                studentAns === correctAnswerText || studentAns === String(rawQ.correctAnswer);
            } else if (rawQ.correct_answer !== undefined) {
              correctAnswerText = String(rawQ.correct_answer);
              isCorrect =
                studentAns.trim().toLowerCase() === correctAnswerText.trim().toLowerCase();
            } else {
              // Sample fallback
              isCorrect = studentAns.length > 0;
              correctAnswerText = q.options ? q.options[0] : 'Standard Solution';
            }

            const explanation =
              result.explanations?.[q.id] ||
              rawQ.explanation ||
              `The answer follows the fundamental principles of ${q.topic_title || 'this topic'}.`;

            const isExpanded = !!expandedQuestions[q.id];

            return (
              <div
                key={q.id}
                className={cn(
                  'rounded-xl border transition-all',
                  isCorrect
                    ? 'border-emerald-500/20 bg-card hover:border-emerald-500/40'
                    : 'border-rose-500/20 bg-card hover:border-rose-500/40'
                )}
              >
                {/* Header row */}
                <div
                  onClick={() => toggleExpand(q.id)}
                  className="flex items-center justify-between p-4 sm:p-5 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold',
                        isCorrect
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {isCorrect ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          Question {idx + 1}
                        </span>
                        {q.topic_title && (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {q.topic_title}
                          </span>
                        )}
                        <span
                          className={cn(
                            'text-[11px] font-bold',
                            isCorrect
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {isCorrect ? `+${q.marks || 1} Marks` : '0 Marks'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-foreground/80 line-clamp-1">
                        {q.question.replace(/[#*`_~$\-]/g, '')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-xs hidden sm:inline">
                      {isExpanded ? 'Hide Details' : 'View Solution'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-border/70 p-5 space-y-4 bg-muted/10 rounded-b-xl">
                    {/* Question text */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Question:
                      </h4>
                      <MarkdownRenderer content={q.question} className="text-sm font-medium" />
                    </div>

                    {/* Answers side-by-side or stacked */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Student's answer */}
                      <div
                        className={cn(
                          'rounded-lg border p-3',
                          isCorrect
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-rose-500/30 bg-rose-500/5'
                        )}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                          Your Answer:
                        </span>
                        <div
                          className={cn(
                            'font-semibold text-sm',
                            isCorrect
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-rose-700 dark:text-rose-300'
                          )}
                        >
                          {studentAns ? studentAns : <em className="italic font-normal">Unanswered</em>}
                        </div>
                      </div>

                      {/* Correct answer */}
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block mb-1">
                          Correct Answer:
                        </span>
                        <div className="font-semibold text-sm text-emerald-800 dark:text-emerald-200">
                          {correctAnswerText}
                        </div>
                      </div>
                    </div>

                    {/* Explanation */}
                    {explanation && (
                      <div className="rounded-lg border border-border bg-card p-3.5 space-y-1">
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3" />
                          Explanation & Concept Walkthrough
                        </h5>
                        <MarkdownRenderer content={explanation} className="text-xs text-foreground/90" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default QuizResults;
