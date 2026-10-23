"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, CircleDot, BookOpen, RotateCcw, Award } from "lucide-react";
import type { TopicStatus } from "@/types";
import { cn } from "@/lib/utils";

export interface StatusConfig {
  key: TopicStatus;
  label: string;
  description: string;
  chipClass: string;
  dotClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const STATUS_CONFIGS: Record<TopicStatus, StatusConfig> = {
  not_started: {
    key: "not_started",
    label: "Not Started",
    description: "Yet to begin studying this topic",
    chipClass:
      "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700/80",
    dotClass: "bg-slate-400 dark:bg-slate-500",
    icon: CircleDot,
  },
  studied: {
    key: "studied",
    label: "Studied",
    description: "Read through initial notes or lectures",
    chipClass:
      "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/60",
    dotClass: "bg-blue-500 dark:bg-blue-400",
    icon: BookOpen,
  },
  revised: {
    key: "revised",
    label: "Revised",
    description: "Reviewed summary & cheat sheets",
    chipClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/60",
    dotClass: "bg-emerald-500 dark:bg-emerald-400",
    icon: RotateCcw,
  },
  tested: {
    key: "tested",
    label: "Tested",
    description: "Practiced quizzes or past papers",
    chipClass:
      "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/60",
    dotClass: "bg-purple-500 dark:bg-purple-400",
    icon: Award,
  },
};

export interface StatusChipProps {
  status: TopicStatus;
  onChange?: (newStatus: TopicStatus) => void;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}

export function StatusChip({
  status,
  onChange,
  size = "sm",
  disabled = false,
  className,
}: StatusChipProps) {
  // Optimistic local status for instantaneous UI response
  const [localStatus, setLocalStatus] = useState<TopicStatus>(status);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync if external status prop changes
  useEffect(() => {
    setLocalStatus(status);
  }, [status]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const currentConfig = STATUS_CONFIGS[localStatus] || STATUS_CONFIGS.not_started;
  const IconComponent = currentConfig.icon;

  const handleSelectStatus = (newStatus: TopicStatus) => {
    if (disabled || newStatus === localStatus) {
      setIsOpen(false);
      return;
    }
    // Optimistic update
    setLocalStatus(newStatus);
    setIsOpen(false);
    onChange?.(newStatus);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Status: ${currentConfig.label}. Click to change status`}
        className={cn(
          "inline-flex items-center gap-1.5 font-medium rounded-full border transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
          size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs sm:text-sm",
          currentConfig.chipClass,
          disabled && "opacity-60 cursor-not-allowed hover:bg-inherit",
          className
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0 transition-colors",
            currentConfig.dotClass
          )}
          aria-hidden="true"
        />
        <span>{currentConfig.label}</span>
        {!disabled && (
          <ChevronDown
            className={cn(
              "h-3 w-3 shrink-0 opacity-60 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
            aria-hidden="true"
          />
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Select topic status"
          className="absolute left-0 mt-1.5 w-52 origin-top-left rounded-xl border border-border bg-card p-1 shadow-lg ring-1 ring-black/5 dark:ring-white/10 z-50 animate-in fade-in-0 zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1">
            Topic Status
          </div>
          {(Object.keys(STATUS_CONFIGS) as TopicStatus[]).map((statusKey) => {
            const config = STATUS_CONFIGS[statusKey];
            const isSelected = statusKey === localStatus;
            const ItemIcon = config.icon;

            return (
              <button
                key={statusKey}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelectStatus(statusKey)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors cursor-pointer",
                  isSelected
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      config.dotClass
                    )}
                  />
                  <div className="truncate">
                    <p className="font-medium truncate">{config.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {config.description}
                    </p>
                  </div>
                </div>
                {isSelected ? (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                ) : (
                  <ItemIcon className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
