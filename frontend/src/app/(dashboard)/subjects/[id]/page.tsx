'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  FileText,
  FileQuestion,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Upload,
  Plus,
  Search,
  Filter,
  Eye,
  X,
  ChevronDown,
  Loader2,
  RefreshCw,
  ExternalLink,
  Brain,
  Download,
  Share2,
} from 'lucide-react';
import { cn, getDaysUntil, formatDate, formatRelativeTime, formatBytes } from '@/lib/utils';
import {
  getSubject,
  getTopicTree,
  getNotes,
  getCheatSheets,
  getQuestionPapers,
  getQuizzes,
  getDocuments,
  updateTopicStatus,
  generateNotes,
  generateCheatSheet,
  generateQuestionPaper,
} from '@/lib/api/endpoints';
import { useToast } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { UploadZone } from '@/components/features/upload-zone';
import { JobStepper } from '@/components/features/job-stepper';
import type {
  Subject,
  TopicTree,
  TopicUnit,
  TopicChapter,
  TopicStatus,
  Note,
  Artifact,
  QuestionPaper,
  Quiz,
  Document as DocumentType,
  NoteDepth,
  CheatSheetScope,
  CheatSheetFormat,
} from '@/types';

// ==========================================
// Circular Progress Component
// ==========================================
function CircularProgressRing({
  percentage,
  color,
  size = 64,
  strokeWidth = 6,
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
      <span className="absolute text-xs font-black text-foreground">
        {percentage}%
      </span>
    </div>
  );
}

// Status styles helper
const statusConfig: Record<
  TopicStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  not_started: {
    label: 'Not Started',
    bg: 'bg-muted/70',
    text: 'text-muted-foreground',
    border: 'border-border',
    dot: 'bg-muted-foreground/50',
  },
  studied: {
    label: 'Studied',
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
    dot: 'bg-blue-500',
  },
  revised: {
    label: 'Revised',
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/20',
    dot: 'bg-purple-500',
  },
  tested: {
    label: 'Tested',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
};

export default function SubjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const subjectId = (params?.id as string) || '';
  const initialTab = searchParams?.get('tab') || 'overview';

  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'topics' | 'notes' | 'artifacts' | 'quizzes'>(
    (initialTab as 'overview' | 'topics' | 'notes' | 'artifacts' | 'quizzes') || 'overview'
  );
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [topicStatusFilter, setTopicStatusFilter] = useState<'all' | TopicStatus>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Modals state
  const [activeNoteModal, setActiveNoteModal] = useState<Note | null>(null);
  const [activeArtifactModal, setActiveArtifactModal] = useState<Artifact | QuestionPaper | null>(null);
  const [generateNotesDialogOpen, setGenerateNotesDialogOpen] = useState(false);
  const [selectedChapterForNotes, setSelectedChapterForNotes] = useState<string>('');
  const [noteDepth, setNoteDepth] = useState<NoteDepth>('standard');
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  // 1. Fetch Subject
  const {
    data: subject,
    isLoading: subjectLoading,
    isError: subjectError,
    refetch: refetchSubject,
  } = useQuery<Subject>({
    queryKey: ['subject', subjectId],
    queryFn: () => getSubject(subjectId),
    enabled: !!subjectId,
  });

  // 2. Fetch Topic Tree
  const {
    data: topicTree,
    isLoading: treeLoading,
    refetch: refetchTree,
  } = useQuery<TopicTree>({
    queryKey: ['topic-tree', subjectId],
    queryFn: () => getTopicTree(subjectId),
    enabled: !!subjectId,
  });

  // 3. Fetch Notes
  const {
    data: notes = [],
    isLoading: notesLoading,
    refetch: refetchNotes,
  } = useQuery<Note[]>({
    queryKey: ['notes', subjectId],
    queryFn: () => getNotes(subjectId),
    enabled: !!subjectId,
  });

  // 4. Fetch Cheat Sheets & Question Papers
  const {
    data: cheatSheets = [],
    isLoading: cheatSheetsLoading,
  } = useQuery<Artifact[]>({
    queryKey: ['cheat-sheets', subjectId],
    queryFn: () => getCheatSheets(subjectId),
    enabled: !!subjectId,
  });

  const {
    data: questionPapers = [],
    isLoading: papersLoading,
  } = useQuery<QuestionPaper[]>({
    queryKey: ['question-papers', subjectId],
    queryFn: () => getQuestionPapers(subjectId),
    enabled: !!subjectId,
  });

  // 5. Fetch Quizzes
  const {
    data: quizzes = [],
    isLoading: quizzesLoading,
  } = useQuery<Quiz[]>({
    queryKey: ['quizzes', subjectId],
    queryFn: () => getQuizzes(subjectId),
    enabled: !!subjectId,
  });

  // 6. Fetch Documents
  const {
    data: documents = [],
    isLoading: documentsLoading,
    refetch: refetchDocuments,
  } = useQuery<DocumentType[]>({
    queryKey: ['documents', subjectId],
    queryFn: () => getDocuments(subjectId),
    enabled: !!subjectId,
  });

  // Mutation: Update Topic Status
  const statusMutation = useMutation({
    mutationFn: async ({
      chapterId,
      status,
    }: {
      chapterId: string;
      status: TopicStatus;
    }) => {
      return updateTopicStatus(subjectId, chapterId, status);
    },
    onSuccess: (data) => {
      addToast(`Status updated to ${data.status.replace('_', ' ')}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['topic-tree', subjectId] });
      queryClient.invalidateQueries({ queryKey: ['subject', subjectId] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to update topic status';
      addToast(msg, 'error');
    },
  });

  // Flatten chapters and calculate statistics
  const units: TopicUnit[] = useMemo(() => topicTree?.units || [], [topicTree]);

  const allChapters: TopicChapter[] = useMemo(() => {
    return units.flatMap((u) => u.chapters || []);
  }, [units]);

  const totalChapters = allChapters.length;
  const completedChapters = allChapters.filter(
    (c) => c.status === 'studied' || c.status === 'revised' || c.status === 'tested'
  ).length;

  const statusCounts = useMemo(() => {
    return {
      not_started: allChapters.filter((c) => c.status === 'not_started').length,
      studied: allChapters.filter((c) => c.status === 'studied').length,
      revised: allChapters.filter((c) => c.status === 'revised').length,
      tested: allChapters.filter((c) => c.status === 'tested').length,
    };
  }, [allChapters]);

  const completionPercentage = totalChapters > 0
    ? Math.round((completedChapters / totalChapters) * 100)
    : 0;

  const daysLeft = getDaysUntil(subject?.exam_date);
  const themeColor = subject?.color || '#6366F1';

  // Handle Document Upload Complete
  const handleUploadComplete = (doc: DocumentType) => {
    addToast(`Uploaded ${doc.filename}. Starting curriculum parsing...`, 'info', 'Document Uploaded');
    refetchDocuments();
    // Start live job stepper
    setActiveJobId(`job-parse-${doc.id}`);
  };

  // Handle Job Stepper Complete
  const handleJobComplete = () => {
    addToast('Topic tree parsed and generated successfully!', 'success', 'Processing Complete');
    queryClient.invalidateQueries({ queryKey: ['topic-tree', subjectId] });
    queryClient.invalidateQueries({ queryKey: ['subject', subjectId] });
    refetchTree();
    refetchSubject();
  };

  // Handle Note Generation
  const handleTriggerGenerateNotes = async () => {
    if (!selectedChapterForNotes) {
      addToast('Please select a chapter to generate notes for', 'warning');
      return;
    }
    setIsGeneratingNotes(true);
    try {
      const res = await generateNotes({
        chapter_id: selectedChapterForNotes,
        depth: noteDepth,
      });
      addToast('Notes generation job started!', 'info');
      setGenerateNotesDialogOpen(false);
      if (res.job_id) {
        setActiveJobId(res.job_id);
        setActiveTab('overview');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start notes generation';
      addToast(msg, 'error');
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  // Filtered units & chapters for Topics tab
  const filteredUnits = useMemo(() => {
    return units
      .map((unit) => {
        const matchingChapters = (unit.chapters || []).filter((chapter) => {
          const matchesStatus =
            topicStatusFilter === 'all' || chapter.status === topicStatusFilter;
          const matchesQuery =
            !topicSearchQuery ||
            chapter.title.toLowerCase().includes(topicSearchQuery.toLowerCase()) ||
            chapter.concepts.some((c) =>
              c.title.toLowerCase().includes(topicSearchQuery.toLowerCase())
            );
          return matchesStatus && matchesQuery;
        });

        return {
          ...unit,
          chapters: matchingChapters,
        };
      })
      .filter((unit) => unit.chapters.length > 0);
  }, [units, topicSearchQuery, topicStatusFilter]);

  // Error State
  if (subjectError) {
    return (
      <div className="py-12">
        <EmptyState
          icon={AlertCircle}
          title="Subject not found"
          description="We couldn't load the requested subject workspace. It may have been deleted or moved."
          action={{
            label: 'Back to Dashboard',
            onClick: () => router.push('/'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Breadcrumb: Dashboard > Subject Name */}
      <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href="/"
          className="hover:text-foreground transition-colors hover:underline"
        >
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href="/subjects"
          className="hover:text-foreground transition-colors hover:underline"
        >
          Subjects
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        {subjectLoading ? (
          <Skeleton className="h-4 w-28" />
        ) : (
          <span className="font-semibold text-foreground truncate max-w-xs">
            {subject?.title}
          </span>
        )}
      </nav>

      {/* 2. Subject Header */}
      {subjectLoading ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full max-w-lg" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs">
          {/* Top colored accent bar */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ backgroundColor: themeColor }}
          />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="h-3.5 w-3.5 rounded-full shadow-xs"
                  style={{ backgroundColor: themeColor }}
                  aria-hidden="true"
                />
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {subject?.title}
                </h1>

                {/* Exam Countdown Badge */}
                {daysLeft !== null ? (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-xs',
                      daysLeft <= 7
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        : daysLeft <= 14
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-primary/10 text-primary border border-primary/20'
                    )}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {daysLeft === 0 ? 'Exam is Today!' : `${daysLeft} days until exam`}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>No exam date set</span>
                  </span>
                )}
              </div>

              {subject?.description && (
                <p className="max-w-3xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {subject.description}
                </p>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
              <button
                type="button"
                onClick={() => {
                  if (allChapters.length > 0) {
                    setSelectedChapterForNotes(allChapters[0].id);
                  }
                  setGenerateNotesDialogOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all hover:scale-102 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Generate Notes</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('artifacts');
                  addToast('Select scope to generate a cheat sheet', 'info');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>Cheat Sheet</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('artifacts');
                  addToast('Configure questions and marks to generate a paper', 'info');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <FileQuestion className="h-3.5 w-3.5 text-primary" />
                <span>Question Paper</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('quizzes');
                  if (quizzes.length > 0) {
                    addToast(`Found ${quizzes.length} available quizzes`, 'info');
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Brain className="h-3.5 w-3.5 text-emerald-500" />
                <span>Take Quiz</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-border/80 overflow-x-auto scrollbar-none gap-2">
        {[
          { id: 'overview', label: 'Overview', icon: BookOpen },
          { id: 'topics', label: 'Topics', icon: Layers, count: totalChapters },
          { id: 'notes', label: 'Notes', icon: FileText, count: notes.length },
          {
            id: 'artifacts',
            label: 'Artifacts',
            icon: FileQuestion,
            count: cheatSheets.length + questionPapers.length,
          },
          { id: 'quizzes', label: 'Quizzes', icon: Brain, count: quizzes.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer',
                isActive
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Tab Content */}

      {/* === OVERVIEW TAB === */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Active Job Stepper Notification (if any async task is running) */}
          {activeJobId && (
            <JobStepper
              jobId={activeJobId}
              onComplete={handleJobComplete}
              onViewTopicTree={() => setActiveTab('topics')}
              onError={(msg) => addToast(msg, 'error')}
            />
          )}

          {/* Progress Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Completion Stat Card */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Curriculum Progress
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-foreground">
                    {completedChapters}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    of {totalChapters} chapters completed
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {totalChapters - completedChapters} chapters remaining
                </p>
              </div>

              <CircularProgressRing
                percentage={completionPercentage}
                color={themeColor}
              />
            </div>

            {/* Status Breakdown Chips Card */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs md:col-span-2 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status Breakdown
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time breakdown of chapters across your learning lifecycle
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {(['not_started', 'studied', 'revised', 'tested'] as TopicStatus[]).map(
                  (st) => {
                    const cfg = statusConfig[st];
                    const count = statusCounts[st];
                    return (
                      <div
                        key={st}
                        className={cn(
                          'rounded-xl border p-3 flex flex-col justify-between',
                          cfg.bg,
                          cfg.border
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                          <span className={cn('text-[11px] font-bold', cfg.text)}>
                            {cfg.label}
                          </span>
                        </div>
                        <span className="text-2xl font-black text-foreground mt-1">
                          {count}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>

          {/* Upload Document Section */}
          {totalChapters === 0 && !treeLoading ? (
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center space-y-4">
              <div className="max-w-md mx-auto">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-3">
                  <Upload className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  No Topic Tree Yet
                </h3>
                <p className="text-xs text-muted-foreground mt-1 mb-6">
                  Upload your syllabus document (PDF, DOCX) to automatically generate your units, chapters, and concepts.
                </p>
              </div>

              <UploadZone
                subjectId={subjectId}
                onUploadComplete={handleUploadComplete}
                onError={(err) => addToast(err, 'error')}
              />
            </div>
          ) : (
            <>
              {/* If topics exist: Summary Grid of Chapters */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <h2 className="text-base font-bold tracking-tight text-foreground">
                      Chapters Overview
                    </h2>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                      {totalChapters}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('topics')}
                    className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>View full topic tree</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allChapters.slice(0, 6).map((chapter) => {
                    const cfg = statusConfig[chapter.status] || statusConfig.not_started;
                    return (
                      <div
                        key={chapter.id}
                        className="rounded-xl border border-border bg-card p-4 shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Chapter #{chapter.order || 1}
                            </span>
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-bold border',
                                cfg.bg,
                                cfg.text,
                                cfg.border
                              )}
                            >
                              {cfg.label}
                            </span>
                          </div>

                          <h3 className="text-xs font-bold text-foreground mt-1.5 line-clamp-1">
                            {chapter.title}
                          </h3>

                          <p className="text-[11px] text-muted-foreground mt-1">
                            {chapter.concepts?.length || 0} key concepts mapped
                          </p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChapterForNotes(chapter.id);
                              setGenerateNotesDialogOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Notes</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const nextStatus: Record<TopicStatus, TopicStatus> = {
                                not_started: 'studied',
                                studied: 'revised',
                                revised: 'tested',
                                tested: 'not_started',
                              };
                              statusMutation.mutate({
                                chapterId: chapter.id,
                                status: nextStatus[chapter.status] || 'studied',
                              });
                            }}
                            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            Cycle status
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upload Additional Documents Card */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                      <Upload className="h-4 w-4 text-primary" />
                      Upload Additional Course Materials
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Upload past exam papers, lecture slides, or supplementary notes
                    </p>
                  </div>
                </div>

                <UploadZone
                  subjectId={subjectId}
                  onUploadComplete={handleUploadComplete}
                  onError={(err) => addToast(err, 'error')}
                />
              </div>

              {/* Recent Subject Documents */}
              {documents.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Subject Documents ({documents.length})
                    </h3>
                  </div>

                  <div className="divide-y divide-border/60">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-semibold text-foreground truncate">
                            {doc.filename}
                          </span>
                          <span className="text-muted-foreground text-[11px] shrink-0">
                            ({formatBytes(doc.file_size)})
                          </span>
                        </div>

                        <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                          {doc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* === TOPICS TAB === */}
      {activeTab === 'topics' && (
        <div className="space-y-6">
          {/* Controls: Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search chapters & concepts..."
                value={topicSearchQuery}
                onChange={(e) => setTopicSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {(['all', 'not_started', 'studied', 'revised', 'tested'] as const).map(
                (filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setTopicStatusFilter(filter)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer',
                      topicStatusFilter === filter
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-background text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {filter === 'all'
                      ? 'All'
                      : statusConfig[filter]?.label || filter}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Topic Units List */}
          {treeLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : filteredUnits.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No topics match your filter"
              description="Try adjusting your search query or status filter to see other curriculum topics."
              action={{
                label: 'Reset Filters',
                onClick: () => {
                  setTopicSearchQuery('');
                  setTopicStatusFilter('all');
                },
              }}
            />
          ) : (
            <div className="space-y-6">
              {filteredUnits.map((unit) => (
                <div
                  key={unit.id}
                  className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-extrabold">
                        {unit.order || 1}
                      </span>
                      <h3 className="text-base font-bold text-foreground">
                        {unit.title}
                      </h3>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {unit.chapters.length} chapters
                    </span>
                  </div>

                  {/* Chapters under Unit */}
                  <div className="space-y-3">
                    {unit.chapters.map((chapter) => {
                      const cfg = statusConfig[chapter.status] || statusConfig.not_started;

                      return (
                        <div
                          key={chapter.id}
                          className="rounded-xl border border-border bg-background/50 p-4 transition-all hover:border-primary/30 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-foreground">
                                {chapter.title}
                              </h4>
                              {chapter.source_spans && chapter.source_spans.length > 0 && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Source pages: {chapter.source_spans.map((s) => s.page).join(', ')}
                                </p>
                              )}
                            </div>

                            {/* Status Selector Dropdown */}
                            <div className="flex items-center gap-2">
                              <select
                                value={chapter.status}
                                onChange={(e) =>
                                  statusMutation.mutate({
                                    chapterId: chapter.id,
                                    status: e.target.value as TopicStatus,
                                  })
                                }
                                className={cn(
                                  'rounded-lg px-2.5 py-1 text-xs font-bold border focus:outline-none cursor-pointer',
                                  cfg.bg,
                                  cfg.text,
                                  cfg.border
                                )}
                              >
                                <option value="not_started">Not Started</option>
                                <option value="studied">Studied</option>
                                <option value="revised">Revised</option>
                                <option value="tested">Tested</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedChapterForNotes(chapter.id);
                                  setGenerateNotesDialogOpen(true);
                                }}
                                title="Generate Notes for this chapter"
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-primary hover:bg-muted transition-colors cursor-pointer"
                              >
                                <Sparkles className="h-3 w-3" />
                                <span className="hidden sm:inline">Notes</span>
                              </button>
                            </div>
                          </div>

                          {/* Concepts list tags */}
                          {chapter.concepts && chapter.concepts.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {chapter.concepts.map((concept) => (
                                <span
                                  key={concept.id}
                                  className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                                >
                                  {concept.title}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === NOTES TAB === */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Study Notes & Summaries
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI-synthesized notes with markdown formulas and key definitions
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (allChapters.length > 0) {
                  setSelectedChapterForNotes(allChapters[0].id);
                }
                setGenerateNotesDialogOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Generate Notes</span>
            </button>
          </div>

          {notesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No notes generated yet"
              description="Pick a chapter to generate clear, structured notes tailored to your exam preparation."
              action={{
                label: 'Generate Notes Now',
                onClick: () => {
                  if (allChapters.length > 0) {
                    setSelectedChapterForNotes(allChapters[0].id);
                  }
                  setGenerateNotesDialogOpen(true);
                },
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                        {note.depth} depth
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatRelativeTime(note.updated_at)}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-foreground line-clamp-1">
                      {allChapters.find((c) => c.id === note.chapter_id)?.title || 'Chapter Notes'}
                    </h3>

                    <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {note.content.substring(0, 200)}...
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground text-[11px]">
                      {note.word_count || 450} words • v{note.version}
                    </span>

                    <button
                      type="button"
                      onClick={() => setActiveNoteModal(note)}
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Read Note</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === ARTIFACTS TAB === */}
      {activeTab === 'artifacts' && (
        <div className="space-y-8">
          {/* Cheat Sheets Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Cheat Sheets ({cheatSheets.length})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Condensed formulas and last-minute revision summaries
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await generateCheatSheet({
                      subject_id: subjectId,
                      scope: 'subject',
                      scope_id: subjectId,
                      format: 'formulas_only',
                    });
                    addToast('Generating cheat sheet...', 'info');
                    if (res.job_id) {
                      setActiveJobId(res.job_id);
                      setActiveTab('overview');
                    }
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Error generating cheatsheet';
                    addToast(msg, 'error');
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>New Cheat Sheet</span>
              </button>
            </div>

            {cheatSheetsLoading ? (
              <Skeleton className="h-28 rounded-xl" />
            ) : cheatSheets.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No cheat sheets generated yet. Click "New Cheat Sheet" to create one.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cheatSheets.map((cs) => (
                  <div
                    key={cs.id}
                    className="rounded-xl border border-border bg-card p-4 shadow-xs flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        {cs.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Generated {formatRelativeTime(cs.created_at)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveArtifactModal(cs)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Question Papers Section */}
          <div className="space-y-4 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileQuestion className="h-4 w-4 text-primary" />
                  Mock Exam Papers ({questionPapers.length})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI-generated practice question papers with marking schemes
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const chIds = allChapters.map((c) => c.id).slice(0, 3);
                    const res = await generateQuestionPaper({
                      subject_id: subjectId,
                      chapter_ids: chIds.length > 0 ? chIds : ['ch-1'],
                      total_marks: 100,
                      duration_minutes: 180,
                      difficulty_mix: { easy: 30, medium: 50, hard: 20 },
                      question_types: [
                        { type: 'mcq', count: 10, marks_each: 2 },
                        { type: 'short_answer', count: 6, marks_each: 5 },
                        { type: 'long_answer', count: 5, marks_each: 10 },
                      ],
                    });
                    addToast('Question paper generation started!', 'info');
                    if (res.job_id) {
                      setActiveJobId(res.job_id);
                      setActiveTab('overview');
                    }
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Error generating paper';
                    addToast(msg, 'error');
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Generate Paper</span>
              </button>
            </div>

            {papersLoading ? (
              <Skeleton className="h-28 rounded-xl" />
            ) : questionPapers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No mock exam papers generated yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {questionPapers.map((qp) => (
                  <div
                    key={qp.id}
                    className="rounded-xl border border-border bg-card p-4 shadow-xs flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        {qp.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {qp.total_marks} Marks • {qp.duration_minutes} Mins
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveArtifactModal(qp)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === QUIZZES TAB === */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Subject Quizzes & Self-Assessment
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Practice topic concepts and identify weak study areas
              </p>
            </div>
          </div>

          {quizzesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : quizzes.length === 0 ? (
            <EmptyState
              icon={Brain}
              title="No quizzes available"
              description="Generate notes or complete topic reading to unlock automated topic quizzes."
            />
          ) : (
            <div className="divide-y divide-border/60 rounded-2xl border border-border bg-card p-5">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {quiz.questions?.length || 0} Questions • {quiz.total_marks || 25} Marks •{' '}
                      {quiz.duration_minutes || 20} mins
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      addToast(`Launching quiz: ${quiz.title}`, 'info');
                      router.push(`/quiz/${quiz.id}`);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all cursor-pointer shrink-0"
                  >
                    <span>Start Quiz</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: Generate Notes Dialog */}
      {/* ==================================================== */}
      {generateNotesDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Generate Study Notes
              </h3>
              <button
                type="button"
                onClick={() => setGenerateNotesDialogOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-foreground">
                  Select Chapter
                </label>
                <select
                  value={selectedChapterForNotes}
                  onChange={(e) => setSelectedChapterForNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  {allChapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-foreground">
                  Notes Depth
                </label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(['brief', 'standard', 'detailed'] as NoteDepth[]).map((depth) => (
                    <button
                      key={depth}
                      type="button"
                      onClick={() => setNoteDepth(depth)}
                      className={cn(
                        'rounded-xl border py-2 text-xs font-semibold capitalize transition-all cursor-pointer',
                        noteDepth === depth
                          ? 'border-primary bg-primary text-primary-foreground font-bold'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {depth}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => setGenerateNotesDialogOpen(false)}
                className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isGeneratingNotes}
                onClick={handleTriggerGenerateNotes}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {isGeneratingNotes ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                <span>Start Generating</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: Read Note Modal */}
      {/* ==================================================== */}
      {activeNoteModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0"
        >
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/60 p-5">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {allChapters.find((c) => c.id === activeNoteModal.chapter_id)?.title ||
                    'Notes Reader'}
                </h3>
                <span className="text-xs text-muted-foreground">
                  Depth: {activeNoteModal.depth} • {activeNoteModal.word_count || 450} words
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveNoteModal(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] prose dark:prose-invert text-xs sm:text-sm text-foreground space-y-4 whitespace-pre-wrap leading-relaxed">
              {activeNoteModal.content}
            </div>

            <div className="border-t border-border/60 p-4 bg-muted/20 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveNoteModal(null)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: View Artifact Modal */}
      {/* ==================================================== */}
      {activeArtifactModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0"
        >
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/60 p-5">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {activeArtifactModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveArtifactModal(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] prose dark:prose-invert text-xs sm:text-sm text-foreground space-y-4 whitespace-pre-wrap leading-relaxed">
              {'content' in activeArtifactModal
                ? activeArtifactModal.content
                : 'questions' in activeArtifactModal
                ? (activeArtifactModal as QuestionPaper).questions
                : 'Content is being generated...'}
            </div>

            <div className="border-t border-border/60 p-4 bg-muted/20 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveArtifactModal(null)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
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
