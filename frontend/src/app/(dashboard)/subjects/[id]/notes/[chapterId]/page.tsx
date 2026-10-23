'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  BookOpen,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getSubject,
  getTopicTree,
  getNotes,
  generateNotes,
} from '@/lib/api/endpoints';
import { useUIStore } from '@/store';
import { useToast } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { JobStepper } from '@/components/features/job-stepper';
import { NotesViewer } from '@/components/features/notes/notes-viewer';
import { ChatDrawer } from '@/components/features/chat/chat-drawer';
import type { Note, TopicChapter } from '@/types';

export default function ChapterNotesPage() {
  const params = useParams<{ id: string; chapterId: string }>();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { toggleChatDrawer } = useUIStore();

  const subjectId = params?.id || '';
  const chapterId = params?.chapterId || '';

  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // 1. Fetch Subject data
  const {
    data: subject,
    isLoading: subjectLoading,
    error: subjectError,
  } = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => getSubject(subjectId),
    enabled: Boolean(subjectId),
  });

  // 2. Fetch Topic Tree to resolve Chapter details
  const {
    data: topicTree,
    isLoading: treeLoading,
  } = useQuery({
    queryKey: ['topic-tree', subjectId],
    queryFn: () => getTopicTree(subjectId),
    enabled: Boolean(subjectId),
  });

  // 3. Fetch Notes for this chapter
  const {
    data: notes,
    isLoading: notesLoading,
    error: notesError,
    refetch: refetchNotes,
  } = useQuery({
    queryKey: ['notes', subjectId, chapterId],
    queryFn: () => getNotes(subjectId, chapterId),
    enabled: Boolean(subjectId && chapterId),
  });

  // Resolve current chapter
  const currentChapter: TopicChapter | null = useMemo(() => {
    if (!topicTree?.units) return null;
    for (const unit of topicTree.units) {
      const match = (unit.chapters || []).find((c) => c.id === chapterId);
      if (match) return match;
    }
    return null;
  }, [topicTree, chapterId]);

  // Resolve active note
  const activeNote: Note | null = useMemo(() => {
    if (!notes || notes.length === 0) return null;
    return notes.find((n) => n.chapter_id === chapterId) || notes[0];
  }, [notes, chapterId]);

  // Generate Notes Mutation (if empty or regenerating)
  const generateMutation = useMutation({
    mutationFn: async () => {
      return generateNotes({
        chapter_id: chapterId,
        depth: 'standard',
      });
    },
    onSuccess: (data) => {
      addToast('Notes generation started!', 'info', 'Generating Notes');
      if (data.job_id) {
        setActiveJobId(data.job_id);
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to start notes generation';
      addToast(msg, 'error');
    },
  });

  const handleJobComplete = () => {
    addToast('Notes successfully generated!', 'success', 'Complete');
    setActiveJobId(null);
    queryClient.invalidateQueries({ queryKey: ['notes', subjectId, chapterId] });
    refetchNotes();
  };

  const chapterTitle = currentChapter?.title || 'Chapter Notes';

  // Loading skeleton layout mimicking text and ToC
  if (notesLoading || subjectLoading || treeLoading) {
    return (
      <div className="space-y-6 pb-20">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-36" />
        </div>

        {/* Toolbar skeleton */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-64" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-border/60">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-24" />
          </div>
        </div>

        {/* Text layout skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="hidden lg:block lg:col-span-3 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>

          <div className="lg:col-span-9 rounded-2xl border border-border bg-card p-8 shadow-xs space-y-5">
            <Skeleton className="h-8 w-2/3" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>

            <Skeleton className="h-20 w-full rounded-xl" />

            <Skeleton className="h-6 w-1/3 pt-3" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>

            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (subjectError || (notesError && !activeNote)) {
    return (
      <div className="py-12 space-y-6">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors hover:underline">
            Dashboard
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link
            href={`/subjects/${subjectId}`}
            className="hover:text-foreground transition-colors hover:underline"
          >
            Subject
          </Link>
        </nav>

        <EmptyState
          icon={AlertCircle}
          title="Could not load chapter notes"
          description="We encountered an issue fetching the notes for this chapter. Please verify your connection or try again."
          action={{
            label: 'Retry Loading',
            onClick: () => refetchNotes(),
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative space-y-6 pb-24">
      {/* 1. Breadcrumbs: Dashboard > Subject Title > Chapter Title */}
      <nav
        aria-label="Breadcrumb navigation"
        className="print:hidden flex items-center gap-2 text-xs text-muted-foreground"
      >
        <Link
          href="/"
          className="hover:text-foreground transition-colors hover:underline"
        >
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <Link
          href={`/subjects/${subjectId}`}
          className="hover:text-foreground transition-colors hover:underline font-medium text-foreground/80 truncate max-w-[200px]"
        >
          {subject?.title || 'Subject'}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="font-semibold text-foreground truncate max-w-xs">
          {chapterTitle}
        </span>
      </nav>

      {/* 2. Live Job Stepper if generation is running */}
      {activeJobId && (
        <div className="print:hidden">
          <JobStepper
            jobId={activeJobId}
            onComplete={handleJobComplete}
            onError={(err) => addToast(err, 'error')}
          />
        </div>
      )}

      {/* 3. Main Notes Viewer or Empty State */}
      {activeNote ? (
        <NotesViewer
          key={`${activeNote.id}-${activeNote.version}`}
          note={activeNote}
          subjectId={subjectId}
          chapterId={chapterId}
          chapterTitle={chapterTitle}
          initialTopicStatus={currentChapter?.status || 'not_started'}
          onJobStarted={(jobId) => setActiveJobId(jobId)}
        />
      ) : (
        /* Empty State: No notes generated yet */
        <div className="rounded-2xl border border-border bg-card p-8 sm:p-12 shadow-xs">
          <EmptyState
            icon={BookOpen}
            title="No notes generated yet"
            description={`Comprehensive AI study notes have not been generated for "${chapterTitle}" yet. Generate notes from your uploaded syllabus and slides now.`}
            action={{
              label: generateMutation.isPending ? 'Starting Generator...' : 'Generate Notes Now',
              onClick: () => generateMutation.mutate(),
            }}
          />
        </div>
      )}

      {/* 4. Floating Doubt-Solver Chat Drawer Toggle Button */}
      <div className="fixed bottom-6 right-6 z-40 print:hidden">
        <button
          type="button"
          onClick={() => toggleChatDrawer(true)}
          className={cn(
            'group flex items-center gap-2 rounded-full px-4 py-3 shadow-xl transition-all duration-200 cursor-pointer',
            'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95'
          )}
          title="Open Doubt-Solver Chat (Ask AI questions about this chapter)"
        >
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span className="text-xs font-bold tracking-wide">
            Ask Doubt
          </span>
        </button>
      </div>

      {/* 5. Doubt-Solver Chat Drawer Component */}
      <ChatDrawer
        subjectId={subjectId}
        chapterId={chapterId}
        chapterTitle={chapterTitle}
      />
    </div>
  );
}
