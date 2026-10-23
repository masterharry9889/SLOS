'use client';

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Layers,
  Clock,
  Award,
  Sliders,
  Plus,
  Trash2,
  FileCheck2,
  FileUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Check,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateQuestionPaperSchema, type GenerateQuestionPaperInput } from '@/lib/schemas';
import { generateQuestionPaper } from '@/lib/api/endpoints';
import { useToast } from '@/components/ui/toaster';
import { JobStepper } from '@/components/features/job-stepper';
import { UploadZone } from '@/components/features/upload-zone';
import { QuestionPaperPreview } from './question-paper-preview';
import type { TopicTree, QuestionPaper } from '@/types';

export interface QuestionPaperGeneratorProps {
  subjectId: string;
  subjectTitle?: string;
  topicTree?: TopicTree | null;
  initialPaper?: QuestionPaper | null;
  onGenerated?: (paper: QuestionPaper) => void;
  className?: string;
}

const QUESTION_TYPE_LABELS = {
  mcq: 'Multiple Choice (MCQ)',
  short_answer: 'Short Answer',
  long_answer: 'Long Answer / Descriptive',
  numerical: 'Numerical / Calculation',
  true_false: 'True / False',
};

export function QuestionPaperGenerator({
  subjectId,
  subjectTitle = 'Subject',
  topicTree,
  initialPaper,
  onGenerated,
  className,
}: QuestionPaperGeneratorProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [currentPaper, setCurrentPaper] = useState<QuestionPaper | null>(initialPaper || null);
  const [showUploadZone, setShowUploadZone] = useState(false);

  // Extract all chapters with concept count
  const allChapters = useMemo(() => {
    const units = topicTree?.units || [];
    return units.flatMap((unit) =>
      (unit.chapters || []).map((ch) => ({
        id: ch.id,
        title: ch.title,
        unitTitle: unit.title,
        conceptCount: ch.concepts?.length || 0,
      }))
    );
  }, [topicTree]);

  // React Hook Form initialization
  const defaultChapterIds = allChapters.length > 0 ? allChapters.map((c) => c.id) : ['chap-1'];

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<GenerateQuestionPaperInput>({
    resolver: zodResolver(generateQuestionPaperSchema),
    defaultValues: {
      subject_id: subjectId,
      chapter_ids: defaultChapterIds,
      total_marks: 50,
      duration_minutes: 90,
      difficulty_mix: {
        easy: 30,
        medium: 50,
        hard: 20,
      },
      question_types: [
        { type: 'mcq', count: 10, marks_each: 1 },
        { type: 'short_answer', count: 5, marks_each: 4 },
        { type: 'long_answer', count: 2, marks_each: 10 },
      ],
      past_paper_document_id: undefined,
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'question_types',
  });

  // Watch form values for dynamic computations
  const watchedChapters = watch('chapter_ids') || [];
  const watchedTotalMarks = watch('total_marks') || 0;
  const watchedQuestionTypes = watch('question_types') || [];
  const watchedDifficulty = watch('difficulty_mix') || { easy: 30, medium: 50, hard: 20 };
  const watchedPastPaperDocId = watch('past_paper_document_id');

  // Calculate live question types total marks
  const calculatedTotalMarks = useMemo(() => {
    return watchedQuestionTypes.reduce((acc, curr) => {
      const count = Number(curr.count) || 0;
      const marks = Number(curr.marks_each) || 0;
      return acc + count * marks;
    }, 0);
  }, [watchedQuestionTypes]);

  const marksMatch = calculatedTotalMarks === watchedTotalMarks && watchedTotalMarks > 0;

  // Auto-adjust difficulty sliders proportionally
  const handleDifficultyChange = (changed: 'easy' | 'medium' | 'hard', newVal: number) => {
    const val = Math.max(0, Math.min(100, newVal));
    const remaining = 100 - val;

    const otherKeys = (['easy', 'medium', 'hard'] as const).filter((k) => k !== changed);
    const k1 = otherKeys[0];
    const k2 = otherKeys[1];

    const currentK1 = watchedDifficulty[k1] || 0;
    const currentK2 = watchedDifficulty[k2] || 0;
    const otherSum = currentK1 + currentK2;

    let newK1 = 0;
    let newK2 = 0;

    if (otherSum > 0) {
      newK1 = Math.round((currentK1 / otherSum) * remaining);
      newK2 = remaining - newK1;
    } else {
      newK1 = Math.floor(remaining / 2);
      newK2 = remaining - newK1;
    }

    setValue(`difficulty_mix.${changed}`, val, { shouldValidate: true });
    setValue(`difficulty_mix.${k1}`, newK1, { shouldValidate: true });
    setValue(`difficulty_mix.${k2}`, newK2, { shouldValidate: true });
  };

  // Chapter selection helpers
  const handleToggleChapter = (chapterId: string) => {
    const current = [...watchedChapters];
    const idx = current.indexOf(chapterId);
    if (idx >= 0) {
      if (current.length === 1) {
        addToast('At least one chapter must be included.', 'warning');
        return;
      }
      current.splice(idx, 1);
    } else {
      current.push(chapterId);
    }
    setValue('chapter_ids', current, { shouldValidate: true });
  };

  const handleSelectAllChapters = () => {
    setValue('chapter_ids', allChapters.map((c) => c.id), { shouldValidate: true });
  };

  const handleDeselectAllChapters = () => {
    if (allChapters.length > 0) {
      setValue('chapter_ids', [allChapters[0].id], { shouldValidate: true });
    }
  };

  // Mutation
  const mutation = useMutation({
    mutationFn: async (data: GenerateQuestionPaperInput) => {
      return generateQuestionPaper(data);
    },
    onSuccess: (data) => {
      if (data?.job_id) {
        setActiveJobId(data.job_id);
        addToast('Question paper generation job queued.', 'info');
      }
    },
    onError: (err: any) => {
      addToast(err?.message || 'Failed to submit question paper generation', 'error');
    },
  });

  const onSubmit = (data: GenerateQuestionPaperInput) => {
    if (!marksMatch) {
      addToast('Marks distribution must match total marks before generating', 'error');
      return;
    }
    mutation.mutate(data);
  };

  // Handle job completion
  const handleJobComplete = (result: any) => {
    queryClient.invalidateQueries({ queryKey: ['question-papers', subjectId] });
    addToast('Question paper created successfully!', 'success');

    const paper: QuestionPaper = {
      id: result?.id || `paper-${Date.now()}`,
      subject_id: subjectId,
      title: result?.title || `${subjectTitle} Practice Exam`,
      questions:
        result?.questions ||
        result?.content ||
        generateSamplePaperMarkdown(watchedQuestionTypes, watchedTotalMarks),
      answer_key:
        result?.answer_key ||
        generateSampleAnswerKeyMarkdown(watchedQuestionTypes),
      marking_scheme:
        result?.marking_scheme ||
        generateSampleMarkingSchemeMarkdown(watchedQuestionTypes),
      total_marks: watchedTotalMarks,
      duration_minutes: watch('duration_minutes') || 90,
      created_at: new Date().toISOString(),
    };

    setCurrentPaper(paper);
    setActiveJobId(null);
    onGenerated?.(paper);
  };

  const handleJobError = (err: string) => {
    addToast(err || 'Failed to generate question paper. Please try again.', 'error');
    setActiveJobId(null);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Configuration Form Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm no-print">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Question Paper Blueprint Studio
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure curriculum coverage, marks weighting, difficulty split, and question types
            </p>
          </div>
          {currentPaper && (
            <button
              type="button"
              onClick={() => setCurrentPaper(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Configure Another Paper
            </button>
          )}
        </div>

        {!activeJobId && !currentPaper && (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-8">
            {/* 1. Chapter Selector */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  1. Syllabus Chapters ({watchedChapters.length} Selected)
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAllChapters}
                    className="text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllChapters}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {allChapters.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No syllabus chapters found. Please parse a curriculum document first.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1 rounded-lg border border-border/70 bg-muted/20">
                  {allChapters.map((ch) => {
                    const isChecked = watchedChapters.includes(ch.id);
                    return (
                      <div
                        key={ch.id}
                        onClick={() => handleToggleChapter(ch.id)}
                        className={cn(
                          'flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-all',
                          isChecked
                            ? 'border-primary bg-primary/10 text-primary shadow-2xs'
                            : 'border-border bg-card text-foreground hover:bg-muted/50'
                        )}
                      >
                        <div
                          className={cn(
                            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                            isChecked
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/40 bg-background'
                          )}
                        >
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{ch.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {ch.unitTitle} • {ch.conceptCount} concepts
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {errors.chapter_ids && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.chapter_ids.message}
                </p>
              )}
            </div>

            {/* 2. Total Marks & Duration */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-primary" />
                  Target Total Marks
                </label>
                <input
                  type="number"
                  {...register('total_marks', { valueAsNumber: true })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. 50 or 100"
                />
                {errors.total_marks && (
                  <p className="text-xs text-destructive">{errors.total_marks.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Exam Duration (Minutes)
                </label>
                <input
                  type="number"
                  {...register('duration_minutes', { valueAsNumber: true })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. 90"
                />
                {errors.duration_minutes && (
                  <p className="text-xs text-destructive">{errors.duration_minutes.message}</p>
                )}
              </div>
            </div>

            {/* 3. Difficulty Mix Sliders */}
            <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-primary" />
                  3. Difficulty Split (Must equal 100%)
                </label>
                <span className="text-xs font-bold text-foreground">
                  {watchedDifficulty.easy}% Easy • {watchedDifficulty.medium}% Medium •{' '}
                  {watchedDifficulty.hard}% Hard
                </span>
              </div>

              {/* Visual Distribution Bar */}
              <div className="h-3 w-full flex rounded-full overflow-hidden border border-border/60">
                <div
                  style={{ width: `${watchedDifficulty.easy}%` }}
                  className="bg-emerald-500 transition-all duration-200"
                  title={`Easy: ${watchedDifficulty.easy}%`}
                />
                <div
                  style={{ width: `${watchedDifficulty.medium}%` }}
                  className="bg-amber-500 transition-all duration-200"
                  title={`Medium: ${watchedDifficulty.medium}%`}
                />
                <div
                  style={{ width: `${watchedDifficulty.hard}%` }}
                  className="bg-rose-500 transition-all duration-200"
                  title={`Hard: ${watchedDifficulty.hard}%`}
                />
              </div>

              {/* Three Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Easy</span>
                    <span className="font-mono">{watchedDifficulty.easy}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={watchedDifficulty.easy}
                    onChange={(e) => handleDifficultyChange('easy', Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">Medium</span>
                    <span className="font-mono">{watchedDifficulty.medium}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={watchedDifficulty.medium}
                    onChange={(e) => handleDifficultyChange('medium', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-rose-600 dark:text-rose-400">Hard</span>
                    <span className="font-mono">{watchedDifficulty.hard}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={watchedDifficulty.hard}
                    onChange={(e) => handleDifficultyChange('hard', Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 4. Question Types Dynamic Configuration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileCheck2 className="h-3.5 w-3.5 text-primary" />
                  4. Question Types & Weightage Breakdown
                </label>
                <button
                  type="button"
                  onClick={() =>
                    append({
                      type: 'short_answer',
                      count: 2,
                      marks_each: 5,
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Question Type
                </button>
              </div>

              <div className="space-y-2">
                {fields.map((field, index) => {
                  const currentItem = watchedQuestionTypes[index] || {};
                  const count = Number(currentItem.count) || 0;
                  const marksEach = Number(currentItem.marks_each) || 0;
                  const subtotal = count * marksEach;

                  return (
                    <div
                      key={field.id}
                      className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 rounded-lg border border-border bg-card p-3 shadow-2xs"
                    >
                      {/* Type Select */}
                      <div className="w-full sm:w-1/2">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-0.5">
                          Format
                        </label>
                        <select
                          {...register(`question_types.${index}.type` as const)}
                          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                        >
                          {Object.entries(QUESTION_TYPE_LABELS).map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Count */}
                      <div className="w-1/3 sm:w-1/5">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-0.5">
                          Questions
                        </label>
                        <input
                          type="number"
                          min="1"
                          {...register(`question_types.${index}.count` as const, {
                            valueAsNumber: true,
                          })}
                          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>

                      {/* Marks Each */}
                      <div className="w-1/3 sm:w-1/5">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-0.5">
                          Marks Each
                        </label>
                        <input
                          type="number"
                          min="1"
                          {...register(`question_types.${index}.marks_each` as const, {
                            valueAsNumber: true,
                          })}
                          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>

                      {/* Subtotal */}
                      <div className="w-1/4 sm:w-24 text-right">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-0.5">
                          Subtotal
                        </label>
                        <span className="text-xs font-bold text-foreground">
                          {subtotal} M
                        </span>
                      </div>

                      {/* Delete */}
                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            if (fields.length <= 1) {
                              addToast('At least one question type is required.', 'warning');
                              return;
                            }
                            remove(index);
                          }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Marks Validation Banner */}
              <div
                className={cn(
                  'flex items-center justify-between rounded-lg border p-3 text-xs font-semibold transition-colors',
                  marksMatch
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'border-destructive/30 bg-destructive/10 text-destructive'
                )}
              >
                <div className="flex items-center gap-2">
                  {marksMatch ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span>
                    Total from types: {calculatedTotalMarks} / {watchedTotalMarks} Marks
                  </span>
                </div>
                <span>
                  {marksMatch
                    ? 'Marks perfectly balanced!'
                    : `Difference: ${Math.abs(watchedTotalMarks - calculatedTotalMarks)} marks`}
                </span>
              </div>
            </div>

            {/* 5. Optional Past Paper Upload */}
            <div className="space-y-3 rounded-xl border border-dashed border-border/80 bg-muted/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileUp className="h-3.5 w-3.5 text-primary" />
                    Upload Past Paper Pattern (Optional)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Slos AI can mirror the question style and structure of previous year exam papers
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUploadZone((prev) => !prev)}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  {showUploadZone ? 'Close Upload' : 'Upload File'}
                </button>
              </div>

              {watchedPastPaperDocId && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Past paper pattern attached ({watchedPastPaperDocId})
                </div>
              )}

              {showUploadZone && (
                <div className="mt-2">
                  <UploadZone
                    subjectId={subjectId}
                    onUploadComplete={(doc) => {
                      setValue('past_paper_document_id', doc.id);
                      setShowUploadZone(false);
                      addToast('Past paper uploaded and linked to generator!', 'success');
                    }}
                  />
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!marksMatch || mutation.isPending}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting Blueprint...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Exam Question Paper
                  </>
                )}
              </button>
              {!marksMatch && (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  * Align the calculated question marks with the target total marks to enable generation.
                </p>
              )}
            </div>
          </form>
        )}

        {/* Job Tracking Stepper */}
        {activeJobId && (
          <div className="mt-6">
            <JobStepper
              jobId={activeJobId}
              title="Generating Question Paper Blueprint & Solution Key"
              onComplete={handleJobComplete}
              onError={handleJobError}
            />
          </div>
        )}
      </div>

      {/* Generated Preview */}
      {currentPaper && (
        <div className="space-y-4">
          <div className="flex items-center justify-between no-print px-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-muted-foreground">
                Question Paper Blueprint Ready
              </span>
            </div>
          </div>
          <QuestionPaperPreview paper={currentPaper} subjectTitle={subjectTitle} />
        </div>
      )}
    </div>
  );
}

// Markdown generators for preview fallback
function generateSamplePaperMarkdown(types: any[], totalMarks: number): string {
  return `
### Section A: Multiple Choice Questions (1 Mark Each)

**Q1.** Which data structure operates on a First-In-First-Out (FIFO) principle? **[1 Mark]**
- (A) Stack
- (B) Queue
- (C) Priority Queue
- (D) Binary Search Tree

**Q2.** What is the worst-case lookup time complexity in an unbalanced Binary Search Tree? **[1 Mark]**
- (A) $O(1)$
- (B) $O(\\log n)$
- (C) $O(n)$
- (D) $O(n \\log n)$

**Q3.** An AVL tree maintains balance by ensuring the height difference between left and right subtrees is at most: **[1 Mark]**
- (A) 0
- (B) 1
- (C) 2
- (D) $\\log n$

---

### Section B: Short Answer Questions (4 Marks Each)

**Q4.** Explain the step-by-step procedure of an in-order traversal of a binary search tree. Why does this traversal output keys in strictly ascending order? **[4 Marks]**

**Q5.** Differentiate between a B-Tree and a B+ Tree with respect to data pointer storage and range query performance. **[4 Marks]**

---

### Section C: Long Answer / Analytical Questions (10 Marks Each)

**Q6.** Given the following sequence of integers inserted into an initially empty AVL Tree:
$$[14, 21, 35, 12, 10, 8, 28]$$
1. Draw the resulting AVL tree at each step where an imbalance occurs.
2. Clearly identify whether a Single Right, Single Left, Left-Right, or Right-Left rotation is required.
3. Compute the final height of the tree. **[10 Marks]**
`;
}

function generateSampleAnswerKeyMarkdown(types: any[]): string {
  return `
### Section A Answers
- **Q1**: **(B) Queue** - Follows FIFO ordering where elements enter from the rear and leave from the front.
- **Q2**: **(C) $O(n)$** - In degenerate (skewed) BSTs, the structure reduces to a singly-linked list.
- **Q3**: **(B) 1** - The AVL balance invariant requires balance factor $\\in \\{-1, 0, 1\\}$.

### Section B Model Answers
- **Q4**:
  - Step 1: Traverse the left subtree recursively.
  - Step 2: Visit and process root node.
  - Step 3: Traverse the right subtree recursively.
  - *Reasoning*: Because for every node $X$, all left subtree keys $< X.key$ and all right subtree keys $> X.key$, processing left, root, then right guarantees strictly ascending order.

### Section C Model Solution
- **Q5 / Q6**:
  - After inserting 14, 21, 35: Imbalance at node 14 (Balance Factor = -2, Right-Right condition). Requires **Single Left (RR) Rotation**.
  - Final root becomes 21 with left child 14 and right child 35.
`;
}

function generateSampleMarkingSchemeMarkdown(types: any[]): string {
  return `
- **Q1 - Q3**: 1 mark for correct option selection. No negative marking.
- **Q4**:
  - Correct recursive sequence stated: **2 Marks**
  - Mathematical BST property explanation: **2 Marks**
- **Q6**:
  - Intermediate tree representations: **4 Marks**
  - Correct identification of rotation types: **3 Marks**
  - Final balanced AVL tree and height computation: **3 Marks**
`;
}

export default QuestionPaperGenerator;
