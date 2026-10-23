"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  Home,
  BookOpen,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store/ui-store";
import { useSubjects } from "@/lib/api/subjects";

const MAIN_NAV_ITEMS = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    title: "Subjects",
    href: "/subjects",
    icon: BookOpen,
  },
  {
    title: "AI Chat",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const {
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    toggleSidebarCollapsed,
  } = useUIStore();
  const { data: subjects = [] } = useSubjects();

  // Close mobile sidebar on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen, setSidebarOpen]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  const navContent = (isMobile = false) => {
    const collapsed = !isMobile && sidebarCollapsed;

    return (
      <div className="flex h-full flex-col justify-between overflow-hidden">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Header & Logo */}
          <div
            className={cn(
              "flex h-16 items-center border-b border-border px-4 transition-all duration-300",
              collapsed ? "justify-center px-2" : "justify-between"
            )}
          >
            <Link
              href="/"
              className="flex items-center gap-3 font-semibold text-foreground tracking-tight group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1"
              title="Student Life OS"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30 transition-transform group-hover:scale-105">
                <GraduationCap className="h-5 w-5" />
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="text-base font-bold tracking-tight text-foreground">
                    Student Life OS
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Study Assistant
                  </span>
                </div>
              )}
            </Link>

            {isMobile && (
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-1 p-3">
            <div className={cn("px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", collapsed && "sr-only")}>
              Main Navigation
            </div>
            {MAIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.title : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              );
            })}
          </div>

          {/* Dynamic Subject List */}
          <div className="flex flex-col gap-1 px-3 pt-2">
            <div
              className={cn(
                "flex items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                collapsed && "sr-only"
              )}
            >
              <span>Subjects</span>
              <Link
                href="/subjects/new"
                title="Add new subject"
                className="text-muted-foreground hover:text-primary transition-colors rounded p-0.5"
              >
                <Plus className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex flex-col gap-1">
              {subjects.map((sub) => {
                const isSubActive = pathname.startsWith(`/subjects/${sub.id}`);
                return (
                  <Link
                    key={sub.id}
                    href={`/subjects/${sub.id}`}
                    title={collapsed ? sub.title : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group",
                      isSubActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform group-hover:scale-125 shadow-xs"
                      style={{ backgroundColor: sub.color || "hsl(var(--primary))" }}
                      aria-hidden="true"
                    />
                    {!collapsed && (
                      <span className="truncate text-xs font-medium">
                        {sub.title}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer with Desktop Collapse Toggle */}
        {!isMobile && (
          <div className="border-t border-border p-3">
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                collapsed && "justify-center px-2"
              )}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4 shrink-0" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  <span>Collapse Sidebar</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar (Persistent) */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out shrink-0 select-none",
          sidebarCollapsed ? "w-16" : "w-64",
          className
        )}
      >
        {navContent(false)}
      </aside>

      {/* Mobile Drawer (Slide-over with Backdrop) */}
      {sidebarOpen && (
        <div
          role="presentation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity duration-300"
        />
      )}

      <aside
        aria-label="Mobile Navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-card border-r border-border shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent(true)}
      </aside>
    </>
  );
}
