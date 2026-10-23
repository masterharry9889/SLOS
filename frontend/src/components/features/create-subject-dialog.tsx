'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Sparkles, Check, Calendar, BookOpen, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createSubjectSchema, type CreateSubjectInput } from '@/lib/schemas';
import { createSubject } from '@/lib/api/endpoints';
import { useToast } from '@/components/ui/toaster';
import type { Subject } from '@/types';

export interface CreateSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (subject: Subject) => void;
}

export const PRESET_SUBJECT_COLORS = [
  { name: 'Indigo', hex: '#6366F1', label: 'Mathematics / Logic' },
  { name: 'Cyan', hex: '#06B6D4', label: 'Physics / Systems' },
  { name: 'Emerald', hex: '#10B981', label: 'Biology / Life Sciences' },
  { name: 'Amber', hex: '#F59E0B', label: 'History / Social Studies' },
  { name: 'Purple', hex: '#8B5CF6', label: 'Literature / Languages' },
  { name: 'Pink', hex: '#EC4899', label: 'Arts / Psychology' },
  { name: 'Blue', hex: '#3B82F6', label: 'Computer Science' },
  { name: 'Teal', hex: '#14B8A6', label: 'Chemistry' },
];

export function CreateSubjectDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateSubjectDialogProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSubjectInput>({
    resolver: zodResolver(createSubjectSchema),
    defaultValues: {
      title: '',
      description: '',
      color: '#6366F1',
      exam_date: '',
    },
  });

  const selectedColor = watch('color') || '#6366F1';

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [open, onOpenChange]);

  const onSubmit = async (values: CreateSubjectInput) => {
    try {
      const payload = {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        color: values.color,
        exam_date: values.exam_date
          ? new Date(values.exam_date).toISOString()
          : undefined,
      };

      const newSubject = await createSubject(payload);

      // Invalidate subjects query in TanStack Query cache
      await queryClient.invalidateQueries({ queryKey: ['subjects'] });

      addToast('Subject created successfully!', 'success', 'Success');
      reset();
      onOpenChange(false);
      onSuccess?.(newSubject);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to create subject';
      addToast(errorMsg, 'error', 'Error');
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-subject-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        role="presentation"
        onClick={() => !isSubmitting && onOpenChange(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in-0"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-2xl transition-all duration-300 animate-in zoom-in-95 fade-in-0 z-10 overflow-hidden">
        {/* Accent strip colored by chosen subject color */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5 transition-colors duration-300"
          style={{ backgroundColor: selectedColor }}
        />

        {/* Dialog Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs transition-colors"
              style={{ backgroundColor: selectedColor }}
            >
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="create-subject-title"
                className="text-lg font-bold tracking-tight text-foreground"
              >
                Create New Subject
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set up a new workspace for notes, syllabus, and exam prep
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          {/* Title Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="subject-title"
              className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between"
            >
              <span>Subject Title *</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Required
              </span>
            </label>
            <input
              id="subject-title"
              type="text"
              placeholder="e.g. Advanced Calculus, Machine Learning"
              disabled={isSubmitting}
              {...register('title')}
              className={cn(
                'w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all',
                errors.title && 'border-destructive focus:ring-destructive/20'
              )}
            />
            {errors.title && (
              <p className="text-xs text-destructive font-medium">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description Textarea */}
          <div className="space-y-1.5">
            <label
              htmlFor="subject-desc"
              className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between"
            >
              <span>Description</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Optional
              </span>
            </label>
            <textarea
              id="subject-desc"
              rows={3}
              placeholder="Brief course description, topics covered, or learning objectives..."
              disabled={isSubmitting}
              {...register('description')}
              className={cn(
                'w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none',
                errors.description && 'border-destructive focus:ring-destructive/20'
              )}
            />
            {errors.description && (
              <p className="text-xs text-destructive font-medium">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Color Picker: 8 study-friendly swatches */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              <span>Workspace Theme Color</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {PRESET_SUBJECT_COLORS.map((item) => {
                const isSelected = selectedColor.toLowerCase() === item.hex.toLowerCase();
                return (
                  <button
                    key={item.hex}
                    type="button"
                    title={`${item.name} (${item.label})`}
                    disabled={isSubmitting}
                    onClick={() => setValue('color', item.hex, { shouldValidate: true })}
                    className={cn(
                      'relative flex h-10 w-full items-center justify-center rounded-xl transition-all duration-200 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isSelected
                        ? 'ring-2 ring-primary ring-offset-2 scale-105'
                        : 'hover:scale-105 opacity-85 hover:opacity-100'
                    )}
                    style={{ backgroundColor: item.hex }}
                  >
                    {isSelected && (
                      <Check className="h-4 w-4 text-white drop-shadow-md stroke-[3]" />
                    )}
                  </button>
                );
              })}
            </div>
            {errors.color && (
              <p className="text-xs text-destructive font-medium">
                {errors.color.message}
              </p>
            )}
          </div>

          {/* Exam Date Picker */}
          <div className="space-y-1.5 pt-1">
            <label
              htmlFor="subject-exam-date"
              className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Upcoming Exam Date</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Optional
              </span>
            </label>
            <input
              id="subject-exam-date"
              type="date"
              disabled={isSubmitting}
              {...register('exam_date')}
              className={cn(
                'w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all',
                errors.exam_date && 'border-destructive focus:ring-destructive/20'
              )}
            />
            {errors.exam_date && (
              <p className="text-xs text-destructive font-medium">
                {errors.exam_date.message}
              </p>
            )}
          </div>

          {/* Dialog Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-102 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating Subject...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Create Subject</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
