'use client';

import React, { useEffect, useMemo } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  ListTree,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useJob } from '@/hooks/useJob';

export interface JobStepperProps {
  jobId: string | null;
  onComplete?: (result: unknown) => void;
  onError?: (error: string) => void;
  onViewTopicTree?: () => void;
  className?: string;
  title?: string;
}

export type StepState = 'pending' | 'active' | 'completed' | 'failed';

interface StepDefinition {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepDefinition[] = [
  {
    id: 'upload',
    label: 'Uploading',
    description: 'Document securely transferred',
    icon: Upload,
  },
  {
    id: 'parse',
    label: 'Parsing Document',
    description: 'Extracting text, sections & formulas',
    icon: FileText,
  },
  {
    id: 'analyze',
    label: 'Analyzing Content',
    description: 'AI analyzing subject curriculum',
    icon: Sparkles,
  },
  {
    id: 'build_tree',
    label: 'Building Topic Tree',
    description: 'Mapping units, chapters & concepts',
    icon: ListTree,
  },
  {
    id: 'complete',
    label: 'Complete',
    description: 'Curriculum structure ready',
    icon: CheckCircle2,
  },
];

export function JobStepper({
  jobId,
  onComplete,
  onError,
  onViewTopicTree,
  className,
  title = 'Processing Curriculum Document',
}: JobStepperProps) {
  const { status, progress, currentStep, result, error, retry } = useJob(jobId);

  // Trigger onComplete callback once
  useEffect(() => {
    if (status === 'completed') {
      onComplete?.(result);
    }
  }, [status, result, onComplete]);

  // Trigger onError callback
  useEffect(() => {
    if (status === 'failed' && error) {
      onError?.(error);
    }
  }, [status, error, onError]);

  // Determine current active step index based on progress and currentStep
  const activeStepIndex = useMemo(() => {
    if (status === 'completed' || progress >= 100) {
      return 4;
    }

    if (currentStep) {
      const lower = currentStep.toLowerCase();
      if (lower.includes('complete') || lower.includes('done')) return 4;
      if (lower.includes('tree') || lower.includes('topic') || lower.includes('structur')) return 3;
      if (lower.includes('analyz') || lower.includes('process') || lower.includes('concept')) return 2;
      if (lower.includes('pars') || lower.includes('extract') || lower.includes('read')) return 1;
      if (lower.includes('upload')) return 0;
    }

    if (progress >= 85) return 3;
    if (progress >= 50) return 2;
    if (progress >= 20) return 1;
    return 0;
  }, [status, progress, currentStep]);

  // Derive status for each individual step
  const getStepState = (index: number): StepState => {
    if (status === 'failed' && index === activeStepIndex) {
      return 'failed';
    }
    if (status === 'completed' || index < activeStepIndex) {
      return 'completed';
    }
    if (index === activeStepIndex) {
      return status === 'running' || status === 'pending' ? 'active' : 'pending';
    }
    return 'pending';
  };

  if (!jobId) {
    return null;
  }

  return (
    <div
      className={cn(
        'w-full rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm transition-all',
        className
      )}
    >
      {/* Header with Title and Current Progress Percentage */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-5 mb-6">
        <div>
          <div className="inline-flex items-center gap-2">
            {status === 'running' && (
              <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
            )}
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              {title}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {status === 'completed'
              ? 'All processing phases finished successfully'
              : status === 'failed'
              ? 'Processing halted due to an error'
              : currentStep || 'Synthesizing document and topic hierarchy...'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Overall Progress
            </span>
            <span className="text-xl font-black text-foreground">
              {Math.min(100, Math.max(0, progress))}%
            </span>
          </div>
        </div>
      </div>

      {/* Global Linear Progress Bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted mb-8">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out rounded-full',
            status === 'failed'
              ? 'bg-destructive'
              : status === 'completed'
              ? 'bg-emerald-500'
              : 'bg-primary'
          )}
          style={{ width: `${Math.min(100, Math.max(progress, 5))}%` }}
        />
      </div>

      {/* Horizontal / Responsive Stepper Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
        {STEPS.map((step, index) => {
          const stepState = getStepState(index);
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={cn(
                'relative flex sm:flex-col items-center sm:items-center gap-3.5 sm:gap-2.5 p-3 sm:p-2 rounded-xl transition-all',
                stepState === 'active' && 'bg-primary/5 sm:bg-transparent ring-1 ring-primary/20 sm:ring-0',
                stepState === 'failed' && 'bg-destructive/5 sm:bg-transparent ring-1 ring-destructive/20 sm:ring-0'
              )}
            >
              {/* Connector line between steps on desktop */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'hidden sm:block absolute top-6 left-1/2 w-full h-[2px] -z-0 transition-colors duration-500',
                    index < activeStepIndex || status === 'completed'
                      ? 'bg-emerald-500'
                      : index === activeStepIndex && status === 'running'
                      ? 'bg-primary/50'
                      : 'bg-border'
                  )}
                  style={{ left: '50%', width: '100%' }}
                  aria-hidden="true"
                />
              )}

              {/* Step Icon Badge */}
              <div
                className={cn(
                  'relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 shadow-xs',
                  stepState === 'completed' &&
                    'border-emerald-500 bg-emerald-500 text-white dark:bg-emerald-600',
                  stepState === 'active' &&
                    'border-primary bg-primary text-primary-foreground ring-4 ring-primary/20 scale-105',
                  stepState === 'failed' &&
                    'border-destructive bg-destructive text-destructive-foreground ring-4 ring-destructive/20',
                  stepState === 'pending' &&
                    'border-border bg-muted/60 text-muted-foreground'
                )}
              >
                {stepState === 'active' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : stepState === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : stepState === 'failed' ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>

              {/* Step Labels */}
              <div className="flex-1 sm:text-center min-w-0">
                <p
                  className={cn(
                    'text-xs font-bold tracking-tight truncate',
                    stepState === 'active' && 'text-primary font-extrabold',
                    stepState === 'completed' && 'text-foreground',
                    stepState === 'failed' && 'text-destructive',
                    stepState === 'pending' && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 leading-snug">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion Banner with "View Topic Tree" Action */}
      {status === 'completed' && (
        <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/30 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in-50 duration-500">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                Topic Tree Generated Successfully!
              </h4>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                Your chapters, key concepts, and study units are structured and ready for study.
              </p>
            </div>
          </div>

          {onViewTopicTree && (
            <button
              type="button"
              onClick={onViewTopicTree}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-semibold shadow-sm transition-all hover:scale-102 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer shrink-0"
            >
              <span>View Topic Tree</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Failure Banner with Retry Action */}
      {status === 'failed' && (
        <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in-50 duration-300">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive text-destructive-foreground shadow-sm">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-destructive">
                Processing Error Encountered
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {error || 'Unable to parse document format or structure.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 bg-background px-3.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Job</span>
          </button>
        </div>
      )}
    </div>
  );
}
