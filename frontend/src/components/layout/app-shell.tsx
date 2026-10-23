"use client";

import React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
}

export function AppShell({ children, breadcrumbs, className }: AppShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar breadcrumbs={breadcrumbs} />

        {/* Scrollable main body */}
        <main
          className={cn(
            "flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-colors",
            className
          )}
        >
          <div className="mx-auto max-w-7xl w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
