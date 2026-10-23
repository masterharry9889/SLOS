"use client";

import React from "react";
import Link from "next/link";
import { useIsMounted } from "@/lib/hooks/use-is-mounted";
import {
  Flame,
  Clock,
  BookOpen,
  Calendar,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Award,
  ChevronRight,
  Sparkles,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth-store";
import { useDashboardData } from "@/lib/api/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toaster";
import type { Subject } from "@/types";

// Helper for SVG circular progress
function CircularProgress({
  percentage,
  color,
  size = 54,
  strokeWidth = 5,
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
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
          fill="none"
        />
        {/* Progress bar */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color || "hsl(var(--primary))"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-foreground">
        {percentage}%
      </span>
    </div>
  );
}

// Days remaining calculation helper
function getDaysUntil(dateString?: string): number | null {
  if (!dateString) return null;
  const target = new Date(dateString).getTime();
  const now = new Date().getTime();
  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading, isError, refetch } = useDashboardData();
  const { addToast } = useToast();
  const mounted = useIsMounted();

  const todayFormatted = mounted
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date())
    : "Wednesday, October 21, 2026";

  const subjects = data?.subjects || [];
  const upcomingExams = subjects
    .filter((s) => s.exam_date)
    .sort(
      (a, b) =>
        new Date(a.exam_date!).getTime() - new Date(b.exam_date!).getTime()
    );

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Could not load dashboard data"
        description="We ran into an issue retrieving your study analytics. Please check your connection and retry."
        action={{
          label: "Retry",
          onClick: () => refetch(),
        }}
        className="my-12"
      />
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Welcome Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Welcome back, {user?.name || "Student"} 👋
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {todayFormatted} • Ready to make meaningful progress today?
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 pt-2 sm:pt-0">
          <Link
            href="/study"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Start Study Session</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Metric Cards (Streak + Continue Banner) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Study Streak Card */}
        {isLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-card to-amber-500/5 p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Active Study Streak
                </span>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-3xl font-black text-foreground tracking-tight">
                    {data?.study_streak ?? 14}
                  </span>
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    Days in a row
                  </span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20 shadow-xs">
                <Flame className="h-7 w-7 fill-amber-500 text-amber-500 animate-pulse" />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              🔥 Keep your momentum going! Study 20 minutes today to maintain your streak.
            </p>
          </div>
        )}

        {/* Continue Where You Left Off Card */}
        {isLoading ? (
          <Skeleton className="h-32 rounded-xl lg:col-span-2" />
        ) : data?.continue_item ? (
          <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-primary/5 via-card to-card p-5 shadow-sm transition-all hover:border-primary/50 lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary mb-2">
                  <Clock className="h-3 w-3" />
                  <span>Continue where you left off</span>
                </div>
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  {data.continue_item.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {data.continue_item.subject_title} • {data.continue_item.description}
                </p>
              </div>

              <Link
                href={`/subjects/${data.continue_item.subject_id}`}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors shrink-0"
              >
                <span>Resume</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-3 sm:hidden pt-2 border-t border-border/50">
              <Link
                href={`/subjects/${data.continue_item.subject_id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <span>Resume study session</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Select a subject to start your next study topic.
            </p>
          </div>
        )}
      </div>

      {/* 3. Subject Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Your Subjects
            </h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {subjects.length}
            </span>
          </div>

          <Link
            href="/subjects"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <span>View All</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No subjects yet"
            description="Add your first subject to generate personalized notes, summaries, and exam prep."
            action={{
              label: "Add Subject",
              onClick: () => addToast("Create subject modal will open", "info"),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjects.map((subject: Subject) => {
              const completionPercent = Math.round(
                ((subject.completed_topics || 0) /
                  (subject.total_topics || 1)) *
                  100
              );
              const daysLeft = getDaysUntil(subject.exam_date);

              return (
                <Link
                  key={subject.id}
                  href={`/subjects/${subject.id}`}
                  className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {/* Colored Top Accent Bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                    style={{ backgroundColor: subject.color || "hsl(var(--primary))" }}
                  />

                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 pt-1">
                      <div className="flex-1">
                        <h3 className="font-bold text-sm text-foreground tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                          {subject.title}
                        </h3>
                        {subject.description && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {subject.description}
                          </p>
                        )}
                      </div>

                      {/* Circular Progress Ring */}
                      <CircularProgress
                        percentage={completionPercent}
                        color={subject.color}
                      />
                    </div>

                    {/* Topic details */}
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>
                        <strong className="text-foreground">
                          {subject.completed_topics}
                        </strong>{" "}
                        of {subject.total_topics} topics completed
                      </span>
                    </div>
                  </div>

                  {/* Exam countdown footer */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                    {daysLeft !== null ? (
                      <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Exam in {daysLeft} days</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">
                        No exam scheduled
                      </span>
                    )}

                    <span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all text-xs font-medium inline-flex items-center gap-0.5">
                      Open <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Charts Section: Weekly Study Minutes + Quiz Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Weekly Study Minutes Bar Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Weekly Study Minutes
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daily study session distribution this week
              </p>
            </div>
            <span className="text-xs font-semibold text-primary bg-primary/10 rounded-md px-2 py-1">
              {data?.weekly_study_minutes.reduce((acc, c) => acc + c.minutes, 0)} min total
            </span>
          </div>

          <div className="h-60 w-full pt-2">
            {isLoading || !mounted ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.weekly_study_minutes || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis
                    dataKey="day"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    unit="m"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border border-border bg-card p-2 shadow-md text-xs">
                            <p className="font-semibold text-foreground">
                              {payload[0].payload.day}
                            </p>
                            <p className="text-primary font-bold">
                              {payload[0].value} minutes
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="minutes"
                    fill="hsl(var(--primary))"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quiz Score Trend Line Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Quiz Performance Trend
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Evaluation scores over recent attempts
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-md px-2 py-1">
              Avg 78%
            </span>
          </div>

          <div className="h-60 w-full pt-2">
            {isLoading || !mounted ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data?.quiz_score_trend || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[40, 100]}
                    unit="%"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border bg-card p-2 shadow-md text-xs">
                            <p className="font-medium text-muted-foreground text-[10px]">
                              {item.date} • {item.quiz_title}
                            </p>
                            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                              Score: {item.score}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ fill: "#10b981", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 5. Bottom Section: Weak Topics & Exam Countdown List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weak Topics List */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Target Topics for Improvement
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Concepts where quiz scores were below 70%
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : !data?.weak_topics || data.weak_topics.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No weak topics identified"
              description="Great job! Your recent quiz performance shows strong mastery across all active topics."
            />
          ) : (
            <div className="divide-y divide-border/60">
              {data.weak_topics.map((topic) => (
                <div
                  key={topic.topic_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">
                      {topic.topic_title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {topic.subject_title}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                        topic.score_percentage < 60
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {topic.score_percentage}% Score
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        addToast(`Starting practice session for ${topic.topic_title}`, "info")
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                    >
                      <span>Practice now</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Exams Countdown Cards */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Upcoming Exams
              </h3>
            </div>

            {isLoading ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : upcomingExams.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No upcoming exam deadlines configured.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingExams.map((subj) => {
                  const daysLeft = getDaysUntil(subj.exam_date) ?? 0;
                  const formattedDate = new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                  }).format(new Date(subj.exam_date!));

                  return (
                    <div
                      key={subj.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3"
                    >
                      <div>
                        <p className="text-xs font-semibold text-foreground line-clamp-1">
                          {subj.title}
                        </p>
                        <p
                          className="text-[11px] text-muted-foreground mt-0.5"
                          suppressHydrationWarning
                        >
                          {formattedDate}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          suppressHydrationWarning
                          className={cn(
                            "inline-block rounded-md px-2 py-0.5 text-xs font-bold",
                            daysLeft <= 14
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          {daysLeft}d left
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border">
            <Link
              href="/schedule"
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              <span>View full exam calendar</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
