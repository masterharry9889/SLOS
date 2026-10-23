import React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-indigo-50/60 via-background to-background dark:from-indigo-950/20 dark:via-background dark:to-background p-4 sm:p-6 lg:p-8">
      {/* Subtle study-themed decorative background elements */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-10 -z-10 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl" />

      {/* Centered container */}
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Brand header */}
        <Link
          href="/"
          className="mb-8 flex flex-col items-center gap-2.5 text-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform group-hover:scale-105">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Student Life OS
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Intelligent Academic Lifecycle & Study Companion
            </p>
          </div>
        </Link>

        {/* Card for Auth Form */}
        <div className="w-full rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl shadow-primary/5 transition-all">
          {children}
        </div>

        {/* Minimal Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          &copy; 2026 Student Life OS. Built for focused learning.
        </p>
      </div>
    </div>
  );
}
