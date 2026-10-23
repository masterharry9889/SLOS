'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  FileCheck2,
  Clock,
  Award,
  Calendar,
  ArrowLeft,
  Eye,
  FileText,
  Sparkles,
} from 'lucide-react';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import { getSubject, getTopicTree, getQuestionPapers } from '@/lib/api/endpoints';
import { QuestionPaperGenerator } from '@/components/features/paper/question-paper-generator';
import { Skeleton } from '@/components/ui/skeleton';
import type { Subject, TopicTree, QuestionPaper } from '@/types';

export default function QuestionPaperPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params?.id as string) || '';

  const [selectedPaper, setSelectedPaper] = useState<QuestionPaper | null>(null);

  // 1. Fetch Subject
  const { data: subject, isLoading: subjectLoading } = useQuery<Subject>({
    queryKey: ['subject', subjectId],
    queryFn: () => getSubject(subjectId),
    enabled: !!subjectId,
  });

  // 2. Fetch Topic Tree
  const { data: topicTree, isLoading: treeLoading } = useQuery<TopicTree>({
    queryKey: ['topic-tree', subjectId],
    queryFn: () => getTopicTree(subjectId),
    enabled: !!subjectId,
  });

  // 3. Fetch Previously Generated Question Papers
  const {
    data: questionPapers = [],
    isLoading: papersLoading,
    refetch: refetchPapers,
  } = useQuery<QuestionPaper[]>({
    queryKey: ['question-papers', subjectId],
    queryFn: () => getQuestionPapers(subjectId),
    enabled: !!subjectId,
  });

  const subjectTitle = subject?.title || 'Subject';

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground no-print">
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
        <span className="font-semibold text-foreground">Question Paper</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: subject?.color || 'hsl(var(--primary))' }}
            />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {subjectTitle}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            Exam Paper Generator
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Design comprehensive exam blueprints with custom question types, difficulty splits, and model answers
          </p>
        </div>

        <Link
          href={`/subjects/${subjectId}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted shadow-xs transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Workspace
        </Link>
      </div>

      {/* Generator Component */}
      <QuestionPaperGenerator
        subjectId={subjectId}
        subjectTitle={subjectTitle}
        topicTree={topicTree}
        initialPaper={selectedPaper}
        onGenerated={(paper) => {
          setSelectedPaper(paper);
          refetchPapers();
        }}
      />

      {/* Previously Generated Papers List */}
      <div className="mt-10 space-y-4 no-print">
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-primary" />
              Generated Question Papers
            </h2>
            <p className="text-xs text-muted-foreground">
              Review and print past question papers and model answer keys
            </p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            {questionPapers.length} {questionPapers.length === 1 ? 'Paper' : 'Papers'}
          </span>
        </div>

        {papersLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-full mt-2" />
              </div>
            ))}
          </div>
        ) : questionPapers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <FileCheck2 className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
            <h3 className="text-sm font-semibold text-foreground">No question papers created yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Configure your desired exam blueprint above to generate your first custom question paper.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {questionPapers.map((paper) => {
              const raw: any = paper;
              const isSelected = selectedPaper?.id === paper.id;
              const duration = paper.duration_minutes ?? raw.durationMinutes ?? 90;
              const marks = paper.total_marks ?? raw.totalMarks ?? 50;
              const dateStr = paper.created_at || raw.createdAt;

              return (
                <div
                  key={paper.id}
                  className={cn(
                    'group relative flex flex-col justify-between rounded-xl border p-4 transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                      : 'border-border bg-card hover:border-primary/40 hover:shadow-xs'
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        <Award className="h-3 w-3" />
                        {marks} Marks
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatRelativeTime(dateStr)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {paper.title || raw.title || 'Question Paper'}
                    </h3>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {duration} mins
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(dateStr)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/60">
                    <span className="text-[11px] text-muted-foreground">
                      Model Key Included
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPaper(paper);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                    >
                      <Eye className="h-3 w-3" />
                      View Exam Paper
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
