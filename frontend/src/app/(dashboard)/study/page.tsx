"use client";

import React, { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Focus,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { getSubjects, getTopicTree } from "@/lib/api/endpoints";
import { useStudyTimerStore } from "@/store";
import type { Subject, TopicChapter, TopicTree } from "@/types";

const sessionLengths = [
  { minutes: 25, label: "25 min", detail: "Quick focus" },
  { minutes: 45, label: "45 min", detail: "Deep work" },
  { minutes: 60, label: "60 min", detail: "Long session" },
];

const sessionModes = [
  {
    id: "learn",
    label: "Learn",
    detail: "Understand concepts",
    icon: Brain,
  },
  {
    id: "review",
    label: "Review",
    detail: "Strengthen recall",
    icon: RotateCcw,
  },
  {
    id: "focus",
    label: "Focus",
    detail: "Finish a section",
    icon: Target,
  },
];

function StudySetupPage() {
  const router = useRouter();
  const startTimer = useStudyTimerStore((state) => state.start);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [duration, setDuration] = useState(25);
  const [mode, setMode] = useState("learn");

  const {
    data: subjects = [],
    isLoading: subjectsLoading,
  } = useQuery<Subject[]>({
    queryKey: ["subjects"],
    queryFn: getSubjects,
  });
  const activeSubjectId = selectedSubjectId || subjects[0]?.id || "";

  const {
    data: topicTree,
    isLoading: treeLoading,
  } = useQuery<TopicTree>({
    queryKey: ["topic-tree", activeSubjectId],
    queryFn: () => getTopicTree(activeSubjectId),
    enabled: Boolean(activeSubjectId),
  });

  const chapters = useMemo(() => {
    return topicTree?.units.flatMap((unit) =>
      (unit.chapters || []).map((chapter) => ({
        ...chapter,
        unitTitle: unit.title,
      })),
    ) ?? [];
  }, [topicTree]);

  const activeChapterId =
    selectedChapterId && chapters.some((chapter) => chapter.id === selectedChapterId)
      ? selectedChapterId
      : (chapters.find((chapter) => chapter.status !== "tested") ?? chapters[0])?.id || "";

  const selectedSubject = subjects.find((subject) => subject.id === activeSubjectId);
  const selectedChapter = chapters.find((chapter) => chapter.id === activeChapterId);

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedChapterId("");
  };

  const handleStart = () => {
    if (!activeSubjectId || !activeChapterId) return;
    startTimer(activeSubjectId, activeChapterId);
    router.push(`/subjects/${activeSubjectId}/notes/${activeChapterId}?duration=${duration}&mode=${mode}`);
  };

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <div className="mb-7 flex items-center gap-3">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Study plan
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-foreground">
            Start a study session
          </h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Choose a subject</h2>
                  <p className="text-xs text-muted-foreground">What are you studying today?</p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {subjects.length} subjects
              </span>
            </div>

            {subjectsLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-[72px] animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center">
                <p className="text-sm font-semibold text-foreground">No subjects yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Create a subject before starting a session.</p>
                <Link
                  href="/subjects"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
                >
                  Add subject <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {subjects.map((subject) => {
                  const selected = subject.id === activeSubjectId;
                  const progress = subject.total_topics
                    ? Math.round((subject.completed_topics / subject.total_topics) * 100)
                    : 0;
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => handleSubjectChange(subject.id)}
                      className={`group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        selected
                          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                          : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                      }`}
                    >
                      <span
                        className="h-10 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: subject.color || "#6366f1" }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-foreground">
                          {subject.title}
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <span
                              className="block h-full rounded-full bg-primary"
                              style={{ width: `${progress}%` }}
                            />
                          </span>
                          {progress}% complete
                        </span>
                      </span>
                      {selected && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Target className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-foreground">Select a topic</h2>
                <p className="text-xs text-muted-foreground">Choose the chapter you want to work on</p>
              </div>
            </div>

            {treeLoading ? (
              <div className="h-12 animate-pulse rounded-xl bg-muted" />
            ) : chapters.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">
                No chapters are available for this subject yet.
              </div>
            ) : (
              <div className="relative">
                <select
                  value={activeChapterId}
                  onChange={(event) => setSelectedChapterId(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-input bg-background px-4 py-3 pr-10 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
                  aria-label="Choose a chapter"
                >
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {(chapter as TopicChapter & { unitTitle: string }).unitTitle
                        ? `${(chapter as TopicChapter & { unitTitle: string }).unitTitle} — ${chapter.title}`
                        : chapter.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock3 className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-foreground">Set a session length</h2>
                <p className="text-xs text-muted-foreground">Pick a pace that feels achievable</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {sessionLengths.map((session) => {
                const selected = duration === session.minutes;
                return (
                  <button
                    key={session.minutes}
                    type="button"
                    onClick={() => setDuration(session.minutes)}
                    className={`rounded-xl border px-3 py-3 text-center transition-all ${
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <span className={`block text-sm font-bold ${selected ? "text-primary" : "text-foreground"}`}>
                      {session.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {session.detail}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Focus className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-foreground">Study mode</h2>
                <p className="text-xs text-muted-foreground">Choose your intention</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {sessionModes.map((sessionMode) => {
                const Icon = sessionMode.icon;
                const selected = mode === sessionMode.id;
                return (
                  <button
                    key={sessionMode.id}
                    type="button"
                    onClick={() => setMode(sessionMode.id)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-xs font-bold text-foreground">{sessionMode.label}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">{sessionMode.detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 h-fit">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="bg-gradient-to-br from-primary/12 via-primary/5 to-transparent p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                  <Sparkles className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-primary/20 bg-card/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                  Ready
                </span>
              </div>
              <h2 className="mt-5 text-lg font-extrabold text-foreground">Your session</h2>
              <p className="mt-1 text-xs text-muted-foreground">A focused plan for the next {duration} minutes.</p>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject</p>
                <p className="mt-1 truncate text-sm font-bold text-foreground">
                  {selectedSubject?.title || "Select a subject"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Chapter</p>
                <p className="mt-1 text-sm font-bold leading-snug text-foreground">
                  {selectedChapter?.title || "Select a chapter"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 border-y border-border py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Length</p>
                  <p className="mt-1 text-sm font-bold text-foreground">{duration} minutes</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mode</p>
                  <p className="mt-1 text-sm font-bold capitalize text-foreground">{mode}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleStart}
                disabled={!activeSubjectId || !activeChapterId}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start session
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" />}>
      <StudySetupPage />
    </Suspense>
  );
}
