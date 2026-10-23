"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Menu,
  Search,
  Sun,
  Moon,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useUIStore } from "@/lib/store/ui-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { useToast } from "@/components/ui/toaster";
import { useIsMounted } from "@/lib/hooks/use-is-mounted";

interface TopbarProps {
  breadcrumbs?: { label: string; href?: string }[];
}

export function Topbar({ breadcrumbs }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleSidebar } = useUIStore();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const { addToast } = useToast();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mounted = useIsMounted();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    addToast("You have been signed out successfully.", "info");
    router.push("/login");
  };

  // Generate dynamic breadcrumbs if none provided
  const activeBreadcrumbs: { label: string; href?: string }[] =
    breadcrumbs && breadcrumbs.length > 0
      ? breadcrumbs
      : (() => {
          if (pathname === "/") return [{ label: "Dashboard" }];
          const segments = pathname.split("/").filter(Boolean);
          return segments.map((seg, idx) => ({
            label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
            href: idx === segments.length - 1 ? undefined : `/${segments.slice(0, idx + 1).join("/")}`,
          }));
        })();

  const userDisplayName = user?.name || "Student";
  const userDisplayEmail = user?.email || "student@slos.edu";
  const initials = userDisplayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
      {/* Left section: Mobile menu button + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Toggle navigation drawer"
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb slot */}
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-sm">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors font-medium text-xs"
          >
            Home
          </Link>
          {activeBreadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs font-medium"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-semibold text-xs">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Center section: Global Search Bar */}
      <div className="flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search notes, topics, formulas..."
            className="w-full rounded-lg border border-input bg-background/50 pl-9 pr-12 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
          <div className="hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <kbd>⌘</kbd>
            <kbd>K</kbd>
          </div>
        </div>
      </div>

      {/* Right section: Theme Toggle + Notification Bell + User Avatar */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        {mounted && (
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="h-4.5 w-4.5 text-amber-400" />
            ) : (
              <Moon className="h-4.5 w-4.5 text-indigo-500" />
            )}
          </button>
        )}

        {/* Notifications (Placeholder) */}
        <button
          type="button"
          aria-label="View notifications"
          onClick={() => addToast("No new notifications at this time.", "info")}
          className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
        </button>

        {/* User Avatar Dropdown */}
        <div className="relative ml-1" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            aria-expanded={userDropdownOpen}
            aria-haspopup="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20 hover:ring-2 hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all cursor-pointer"
          >
            {initials || "SL"}
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 z-50">
              {/* User details header */}
              <div className="border-b border-border px-3 py-2.5">
                <p className="text-sm font-semibold text-foreground truncate">
                  {userDisplayName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userDisplayEmail}
                </p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Your Profile</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </Link>
              </div>

              {/* Logout button */}
              <div className="border-t border-border pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
