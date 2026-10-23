'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  Sparkles,
  FileText,
  Clock,
  Calendar,
  BookOpen,
  ArrowLeft,
  Eye,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import { getSubject, getTopicTree, getCheatSheets } from '@/lib/api/endpoints';
import { CheatSheetGenerator } from '@/components/features/cheatsheet/cheatsheet-generator';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { Subject, TopicTree, Artifact, CheatSheetFormat } from '@/types';

export default function CheatSheetPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params?.id as string) || '';

  const [selectedCheatSheet, setSelectedCheatSheet] = useState<Artifact | null>(null);

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

  // 3. Fetch Previously Generated Cheat Sheets
  const {
    data: cheatSheets = [],
    isLoading: cheatSheetsLoading,
    refetch: refetchCheatSheets,
  } = useQuery<Artifact[]>({
    queryKey: ['cheat-sheets', subjectId],
    queryFn: () => getCheatSheets(subjectId),
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
        <span className="font-semibold text-foreground">Cheat Sheet</span>
      </nav>

      {/* Page Title & Subject Badge Header */}
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
            Cheat Sheet Studio
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Generate dense, high-yield revision sheets and formula guides tailored to your syllabus
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

      {/* Main Generator Section */}
      <CheatSheetGenerator
        subjectId={subjectId}
        subjectTitle={subjectTitle}
        topicTree={topicTree}
        initialCheatSheet={selectedCheatSheet}
        onGenerated={(newArtifact) => {
          setSelectedCheatSheet(newArtifact);
          refetchCheatSheets();
        }}
      />

      {/* Previously Generated Cheat Sheets History */}
      <div className="mt-10 space-y-4 no-print">
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Previously Generated Cheat Sheets
            </h2>
            <p className="text-xs text-muted-foreground">
              Instant access to previously generated sheets for this subject
            </p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            {cheatSheets.length} {cheatSheets.length === 1 ? 'Sheet' : 'Sheets'}
          </span>
        </div>

        {cheatSheetsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-full mt-2" />
              </div>
            ))}
          </div>
        ) : cheatSheets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
            <h3 className="text-sm font-semibold text-foreground">No cheat sheets generated yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Select your preferred scope and format above to generate your first revision cheat sheet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cheatSheets.map((sheet) => {
              const isSelected = selectedCheatSheet?.id === sheet.id;
              const format = (sheet.metadata?.format as CheatSheetFormat) || 'one_page';
              return (
                <div
                  key={sheet.id}
                  className={cn(
                    'group relative flex flex-col justify-between rounded-xl border p-4 transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                      : 'border-border bg-card hover:border-primary/40 hover:shadow-xs'
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground capitalize">
                        {format.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatRelativeTime(sheet.created_at)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {sheet.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {sheet.content.replace(/[#*`_~$\-]/g, '').slice(0, 110)}...
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/60">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(sheet.created_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCheatSheet(sheet);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                    >
                      <Eye className="h-3 w-3" />
                      View Sheet
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
