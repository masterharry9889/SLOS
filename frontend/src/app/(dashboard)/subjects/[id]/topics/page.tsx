"use client";

import React, { use } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FolderTree,
  BookOpen,
  Save,
  Clock,
} from "lucide-react";
import { getSubject } from "@/lib/api/endpoints";
import { useTopicTree } from "@/hooks/useTopicTree";
import { TopicTreeEditor } from "@/components/features/topic-tree/topic-tree-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default function SubjectTopicsPage(props: PageProps) {
  // Safe resolution of params for Next.js 15+ / 16
  const clientParams = useParams();
  const routeParamId = clientParams?.id as string | undefined;

  // Fallback to unwrapping params promise or object if needed
  const resolvedParams =
    props.params instanceof Promise ? use(props.params) : props.params;
  const subjectId = routeParamId || resolvedParams?.id || "";

  const router = useRouter();

  // 1. Fetch Subject Details for breadcrumb & header
  const subjectQuery = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: () => getSubject(subjectId),
    enabled: !!subjectId,
    staleTime: 1000 * 60 * 5,
  });

  // 2. Main Topic Tree State Hook
  const treeHook = useTopicTree(subjectId);
  const {
    tree,
    isLoading,
    isError,
    error,
    isDirty,
    isSaving,
    isConfirming,
    isConfirmed,
    lastSavedAt,
    confirmTree,
    saveTreeNow,
    refetch,
  } = treeHook;

  const subjectTitle =
    subjectQuery.data?.title || tree?.subject_title || "Subject Topics";
  const subjectColor = subjectQuery.data?.color || "#3b82f6";

  const handleConfirm = async () => {
    try {
      await confirmTree();
    } catch {
      // Toast notification is handled within hook
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Breadcrumb Navigation ──────────────────────────────────────── */}
      <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link
          href="/"
          className="hover:text-foreground transition-colors font-medium"
        >
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        <Link
          href={`/subjects/${subjectId}`}
          className="hover:text-foreground transition-colors font-medium truncate max-w-[200px]"
        >
          {subjectTitle}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        <span className="text-foreground font-semibold">Topics & Syllabus</span>
      </nav>

      {/* ─── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Link
              href={`/subjects/${subjectId}`}
              aria-label="Back to Subject"
              className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <span
              className="h-3 w-3 rounded-full shrink-0 shadow-2xs"
              style={{ backgroundColor: subjectColor }}
              aria-hidden="true"
            />

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
              {subjectTitle}
            </h1>

            {isConfirmed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-medium border border-emerald-200 dark:border-emerald-800 shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground ml-7">
            Organize units, chapters, and concepts. Drag to reorder, double-click to rename, and confirm to generate study notes.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 self-start md:self-center ml-7 md:ml-0">
          {/* Quick Save button if dirty */}
          {isDirty && (
            <button
              type="button"
              onClick={() => saveTreeNow()}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Save className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          )}

          {/* Confirm Syllabus Button */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming || (isConfirmed && !isDirty)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer select-none",
              isConfirmed && !isDirty
                ? "bg-muted text-muted-foreground cursor-default border border-border"
                : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/20 active:scale-[0.98]"
            )}
          >
            {isConfirming ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                <span>Confirming...</span>
              </>
            ) : isConfirmed && !isDirty ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Syllabus Confirmed</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>{isDirty ? "Save & Confirm" : "Confirm Syllabus"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Loading Skeleton State ─────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-6 animate-pulse" aria-label="Loading syllabus topics">
          {/* Toolbar Skeleton */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card">
            <Skeleton className="h-9 w-64 rounded-xl" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          </div>

          {/* Stats Bar Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl col-span-2" />
          </div>

          {/* Unit Cards Skeletons */}
          {[1, 2, 3].map((unitIndex) => (
            <div
              key={unitIndex}
              className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs"
            >
              {/* Unit Header Skeleton */}
              <div className="flex items-center justify-between p-4 bg-muted/40 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <Skeleton className="h-5 w-48 rounded" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-24 rounded-lg" />
                  <Skeleton className="h-7 w-7 rounded-lg" />
                </div>
              </div>

              {/* Chapters Skeletons */}
              <div className="p-4 space-y-3 bg-background/50">
                {[1, 2].map((chapIndex) => (
                  <div
                    key={chapIndex}
                    className="rounded-xl border border-border/70 p-3 bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-40 rounded" />
                        <Skeleton className="h-4 w-20 rounded-full" />
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Error State ────────────────────────────────────────────────── */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-destructive/20 bg-destructive/5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            Unable to load topic tree
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
            {error instanceof Error ? error.message : "An unexpected network error occurred while retrieving this syllabus."}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* ─── Main Topic Tree Editor ─────────────────────────────────────── */}
      {!isLoading && !isError && (
        <TopicTreeEditor
          subjectId={subjectId}
          treeHook={treeHook}
        />
      )}
    </div>
  );
}
