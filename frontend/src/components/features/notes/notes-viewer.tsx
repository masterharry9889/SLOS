'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  CheckCircle2,
  Edit3,
  Eye,
  RefreshCw,
  Printer,
  Clock,
  Sparkles,
  Save,
  Check,
  X,
  FileText,
  Maximize,
  Minimize,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { updateNote, generateNotes, updateTopicStatus } from '@/lib/api/endpoints';
import { useToast } from '@/components/ui/toaster';
import { TableOfContents } from './table-of-contents';
import { MarkdownRenderer } from './markdown-renderer';
import { StudyTimer } from './study-timer';
import type { Note, NoteDepth, TopicStatus } from '@/types';

interface NotesViewerProps {
  note: Note;
  subjectId: string;
  chapterId: string;
  chapterTitle?: string;
  initialTopicStatus?: TopicStatus;
  onJobStarted?: (jobId: string) => void;
}

const DEPTH_OPTIONS: { id: NoteDepth; label: string; desc: string }[] = [
  { id: 'brief', label: 'Brief', desc: 'High-yield revision summary' },
  { id: 'standard', label: 'Standard', desc: 'Balanced conceptual coverage' },
  { id: 'detailed', label: 'Detailed', desc: 'Exhaustive step-by-step notes' },
];

export function NotesViewer({
  note,
  subjectId,
  chapterId,
  chapterTitle,
  initialTopicStatus = 'not_started',
  onJobStarted,
}: NotesViewerProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // State
  const [content, setContent] = useState<string>(note.content);
  const [prevNoteId, setPrevNoteId] = useState<string>(note.id);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedDepth, setSelectedDepth] = useState<NoteDepth>(note.depth || 'standard');
  const [topicStatus, setTopicStatus] = useState<TopicStatus>(initialTopicStatus);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showRegenConfirm, setShowRegenConfirm] = useState<boolean>(false);
  const [selectedCitationPage, setSelectedCitationPage] = useState<number | null>(null);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state if a different note is passed in (React-recommended pattern instead of useEffect)
  if (note.id !== prevNoteId) {
    setPrevNoteId(note.id);
    setContent(note.content);
    setSelectedDepth(note.depth || 'standard');
  }

  // Clean up autosave timeout on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  // Autosave for edit mode (debounced 2 seconds)
  const handleContentChange = (newText: string) => {
    setContent(newText);
    setSaveStatus('unsaved');

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await updateNote(note.id, { content: newText });
        setSaveStatus('saved');
        queryClient.invalidateQueries({ queryKey: ['notes', subjectId, chapterId] });
      } catch (err: unknown) {
        console.error('Failed to autosave note:', err);
        setSaveStatus('unsaved');
        addToast('Failed to autosave changes', 'error');
      }
    }, 2000);
  };

  // Immediate save on manual button click or exiting edit mode
  const handleManualSave = async () => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    setSaveStatus('saving');
    try {
      await updateNote(note.id, { content });
      setSaveStatus('saved');
      addToast('Notes saved successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['notes', subjectId, chapterId] });
    } catch (err: unknown) {
      setSaveStatus('unsaved');
      const msg = err instanceof Error ? err.message : 'Error saving notes';
      addToast(msg, 'error');
    }
  };

  // Regeneration Mutation
  const regenMutation = useMutation({
    mutationFn: async (targetDepth: NoteDepth) => {
      return generateNotes({
        chapter_id: chapterId,
        depth: targetDepth,
      });
    },
    onSuccess: (data) => {
      addToast('Notes regeneration job initiated!', 'info', 'Regenerating Notes');
      setShowRegenConfirm(false);
      if (data.job_id && onJobStarted) {
        onJobStarted(data.job_id);
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to start regeneration';
      addToast(msg, 'error');
    },
  });

  // Mark As Studied Mutation
  const statusMutation = useMutation({
    mutationFn: async () => {
      const nextStatus: TopicStatus = topicStatus === 'studied' ? 'revised' : 'studied';
      await updateTopicStatus(subjectId, chapterId, nextStatus);
      return nextStatus;
    },
    onMutate: async () => {
      const prev = topicStatus;
      const next: TopicStatus = topicStatus === 'studied' ? 'revised' : 'studied';
      setTopicStatus(next);
      return { prev };
    },
    onSuccess: (next) => {
      addToast(
        next === 'revised'
          ? 'Topic marked as Revised! Keep it up!'
          : 'Topic marked as Studied! Great progress!',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['topic-tree', subjectId] });
      queryClient.invalidateQueries({ queryKey: ['subject', subjectId] });
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) setTopicStatus(context.prev);
      addToast('Failed to update study status', 'error');
    },
  });

  // Calculate metrics
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const readTimeMinutes = Math.max(1, Math.round(wordCount / 180));

  return (
    <div className="relative w-full space-y-6">
      {/* 1. Header Toolbar (Hidden in Print) */}
      <header
        aria-label="Notes viewer toolbar"
        className="print:hidden rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4 transition-all"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Chapter Title & Meta info */}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight truncate">
                {chapterTitle || 'Chapter Study Notes'}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{readTimeMinutes} min read</span>
              </span>
              <span>•</span>
              <span>{wordCount} words</span>
              <span>•</span>
              <span>Version {note.version || 1}</span>
              <span>•</span>
              <span>Updated {formatRelativeTime(note.updated_at)}</span>
            </div>
          </div>

          {/* Action Buttons: Mark Studied, Edit Mode, Print, Focus */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mark as studied button */}
            <button
              type="button"
              onClick={() => statusMutation.mutate()}
              disabled={statusMutation.isPending}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs',
                topicStatus === 'studied' || topicStatus === 'revised'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
              title="Toggle chapter study progress"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>
                {topicStatus === 'studied'
                  ? 'Studied ✓'
                  : topicStatus === 'revised'
                  ? 'Revised ✓'
                  : 'Mark as Studied'}
              </span>
            </button>

            {/* Manual Edit Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                if (isEditing && saveStatus === 'unsaved') {
                  handleManualSave();
                }
                setIsEditing(!isEditing);
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                isEditing
                  ? 'border-primary bg-primary/10 text-primary font-bold'
                  : 'border-border bg-background text-foreground hover:bg-muted'
              )}
            >
              {isEditing ? (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  <span>Preview</span>
                </>
              ) : (
                <>
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </>
              )}
            </button>

            {/* Focus Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={cn(
                'rounded-xl border border-border p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer',
                isFocusMode && 'bg-primary/10 text-primary border-primary/30'
              )}
              title={isFocusMode ? 'Exit focus mode' : 'Enter distraction-free study mode'}
            >
              {isFocusMode ? (
                <Minimize className="h-3.5 w-3.5" />
              ) : (
                <Maximize className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl border border-border bg-background p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Print notes or export to PDF"
            >
              <Printer className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Depth Switcher & Regeneration Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
              Depth:
            </span>
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
              {DEPTH_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (opt.id !== selectedDepth) {
                      setSelectedDepth(opt.id);
                      setShowRegenConfirm(true);
                    }
                  }}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer',
                    selectedDepth === opt.id
                      ? 'bg-card text-foreground shadow-xs border border-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title={opt.desc}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Autosave status indicator in edit mode */}
            {isEditing && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {saveStatus === 'saving' && (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                    <span className="text-primary font-medium">Saving...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span>All changes saved</span>
                  </>
                )}
                {saveStatus === 'unsaved' && (
                  <button
                    type="button"
                    onClick={handleManualSave}
                    className="inline-flex items-center gap-1 text-primary hover:underline font-semibold cursor-pointer"
                  >
                    <Save className="h-3 w-3" />
                    <span>Save now</span>
                  </button>
                )}
              </div>
            )}

            {/* Trigger regeneration button */}
            <button
              type="button"
              onClick={() => setShowRegenConfirm(true)}
              disabled={regenMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', regenMutation.isPending && 'animate-spin')}
              />
              <span>Regenerate</span>
            </button>
          </div>
        </div>

        {/* Regeneration Confirmation Box */}
        {showRegenConfirm && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 animate-in fade-in space-y-3">
            <div className="flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground">
                  Regenerate Notes ({selectedDepth.toUpperCase()} depth)?
                </h4>
                <p className="text-xs text-muted-foreground">
                  This will analyze your uploaded textbooks/slides and generate fresh notes optimized for {selectedDepth} depth.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowRegenConfirm(false)}
                className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => regenMutation.mutate(selectedDepth)}
                disabled={regenMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
              >
                {regenMutation.isPending ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                <span>Confirm & Regenerate</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. Main Content Area: Table of Contents + Markdown / Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Table of Contents Column (Hidden in Focus Mode or Print) */}
        {!isFocusMode && (
          <aside
            aria-label="Notes table of contents"
            className="lg:col-span-3 print:hidden sticky top-20 max-h-[calc(100vh-100px)] overflow-y-auto"
          >
            <TableOfContents content={content} />
          </aside>
        )}

        {/* Content Column */}
        <section
          aria-label="Note content"
          className={cn(
            'transition-all',
            isFocusMode ? 'lg:col-span-12 max-w-4xl mx-auto' : 'lg:col-span-9'
          )}
        >
          {isEditing ? (
            /* Manual Markdown Editor Mode */
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Edit3 className="h-4 w-4 text-primary" />
                  <span>Markdown Editor</span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Autosaves every 2 seconds
                </span>
              </div>

              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                rows={28}
                className="w-full resize-y font-mono text-xs leading-relaxed rounded-xl border border-border bg-background p-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="# Enter markdown headings, LaTeX ($math$), and notes..."
              />
            </div>
          ) : (
            /* Study Reading View */
            <article className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-xs print:border-none print:shadow-none print:p-0 print:max-w-none">
              {/* Print-only title */}
              <div className="hidden print:block mb-6 border-b border-zinc-300 pb-4">
                <h1 className="text-2xl font-black text-black">
                  {chapterTitle || 'Chapter Study Notes'}
                </h1>
                <p className="text-xs text-zinc-600 mt-1">
                  Depth: {note.depth} • Generated by Student Life OS • {wordCount} words
                </p>
              </div>

              <MarkdownRenderer
                content={content}
                onCitationClick={(page) => setSelectedCitationPage(page)}
              />
            </article>
          )}
        </section>
      </div>

      {/* 3. Floating Study Timer Bar (Hidden in Print) */}
      <StudyTimer
        subjectId={subjectId}
        chapterId={chapterId}
        chapterTitle={chapterTitle}
      />

      {/* 4. Source Citation Modal / Info Dialog */}
      {selectedCitationPage !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-xs animate-in fade-in print:hidden">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Referenced Source Page {selectedCitationPage}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCitationPage(null)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This concept was synthesized directly from Page {selectedCitationPage} of your uploaded course documents and lecture syllabus.
            </p>

            <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-foreground/80 space-y-1">
              <span className="font-semibold text-primary">Context:</span>
              <p className="italic text-[11px] text-muted-foreground">
                Document sections on page {selectedCitationPage} contain the source diagrams and primary definitions used in this summary.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedCitationPage(null)}
                className="rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
