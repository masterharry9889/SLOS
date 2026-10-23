"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toaster";
import { updateSettings } from "@/lib/api/endpoints";

interface ThemeOption {
  id: "light" | "dark" | "system";
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const themeOptions: ThemeOption[] = [
  {
    id: "light",
    title: "Light",
    description: "Crisp and clear interface for daytime study sessions.",
    icon: Sun,
  },
  {
    id: "dark",
    title: "Dark",
    description: "Reduced eye strain designed for late-night exam prep.",
    icon: Moon,
  },
  {
    id: "system",
    title: "System Preference",
    description: "Dynamically synchronizes with your device operating system.",
    icon: Laptop,
  },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSelectTheme = (themeId: "light" | "dark" | "system") => {
    setTheme(themeId);

    // Persist to backend user settings in the background
    updateSettings({ theme: themeId }).catch(() => {
      // Gracefully ignore network errors as next-themes handles client-side storage
    });

    addToast(
      `Theme changed to ${themeId.charAt(0).toUpperCase() + themeId.slice(1)} mode`,
      "info"
    );
  };

  // Safe active theme check avoiding hydration mismatch
  const currentTheme = mounted ? theme : "system";

  return (
    <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
      <div className="mb-6 border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Customize the look and feel of your Student Life OS workspace.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" /> Live Preview
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {themeOptions.map((option) => {
          const isSelected = currentTheme === option.id;
          const Icon = option.icon;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelectTheme(option.id)}
              className={cn(
                "group relative flex flex-col text-left rounded-xl border p-4 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/40"
                  : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
              )}
            >
              {/* Selected Badge */}
              {isSelected && (
                <div className="absolute top-3 right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </div>
              )}

              {/* Visual Mockup Container */}
              <div className="mb-4 overflow-hidden rounded-lg border border-border/80 shadow-xs">
                {option.id === "light" && (
                  <div className="h-32 w-full bg-zinc-100 flex flex-col select-none">
                    {/* Mock Window Header */}
                    <div className="h-5 bg-zinc-200 border-b border-zinc-300 flex items-center px-2 gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-rose-400" />
                      <div className="h-2 w-2 rounded-full bg-amber-400" />
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    </div>
                    {/* Mock App Body */}
                    <div className="flex flex-1">
                      {/* Mock Sidebar */}
                      <div className="w-10 bg-white border-r border-zinc-200 p-1.5 flex flex-col gap-1">
                        <div className="h-2 w-full bg-primary/80 rounded-xs" />
                        <div className="h-1.5 w-3/4 bg-zinc-300 rounded-xs" />
                        <div className="h-1.5 w-4/5 bg-zinc-300 rounded-xs" />
                        <div className="h-1.5 w-2/3 bg-zinc-300 rounded-xs" />
                      </div>
                      {/* Mock Main Content */}
                      <div className="flex-1 bg-white p-2.5 space-y-2">
                        <div className="h-3 w-1/3 bg-zinc-800 rounded-xs" />
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="h-10 rounded border border-zinc-200 bg-zinc-50 p-1">
                            <div className="h-1.5 w-1/2 bg-zinc-400 rounded-xs mb-1" />
                            <div className="h-1 w-3/4 bg-zinc-300 rounded-xs" />
                          </div>
                          <div className="h-10 rounded border border-zinc-200 bg-zinc-50 p-1">
                            <div className="h-1.5 w-1/2 bg-zinc-400 rounded-xs mb-1" />
                            <div className="h-1 w-3/4 bg-zinc-300 rounded-xs" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {option.id === "dark" && (
                  <div className="h-32 w-full bg-zinc-950 flex flex-col select-none">
                    {/* Mock Window Header */}
                    <div className="h-5 bg-zinc-900 border-b border-zinc-800 flex items-center px-2 gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-rose-500/80" />
                      <div className="h-2 w-2 rounded-full bg-amber-500/80" />
                      <div className="h-2 w-2 rounded-full bg-emerald-500/80" />
                    </div>
                    {/* Mock App Body */}
                    <div className="flex flex-1">
                      {/* Mock Sidebar */}
                      <div className="w-10 bg-zinc-900 border-r border-zinc-800 p-1.5 flex flex-col gap-1">
                        <div className="h-2 w-full bg-primary rounded-xs" />
                        <div className="h-1.5 w-3/4 bg-zinc-700 rounded-xs" />
                        <div className="h-1.5 w-4/5 bg-zinc-700 rounded-xs" />
                        <div className="h-1.5 w-2/3 bg-zinc-700 rounded-xs" />
                      </div>
                      {/* Mock Main Content */}
                      <div className="flex-1 bg-zinc-950 p-2.5 space-y-2">
                        <div className="h-3 w-1/3 bg-zinc-200 rounded-xs" />
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="h-10 rounded border border-zinc-800 bg-zinc-900 p-1">
                            <div className="h-1.5 w-1/2 bg-zinc-400 rounded-xs mb-1" />
                            <div className="h-1 w-3/4 bg-zinc-600 rounded-xs" />
                          </div>
                          <div className="h-10 rounded border border-zinc-800 bg-zinc-900 p-1">
                            <div className="h-1.5 w-1/2 bg-zinc-400 rounded-xs mb-1" />
                            <div className="h-1 w-3/4 bg-zinc-600 rounded-xs" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {option.id === "system" && (
                  <div className="relative h-32 w-full flex select-none overflow-hidden">
                    {/* Left half: Light */}
                    <div className="w-1/2 h-full bg-white flex flex-col border-r border-border">
                      <div className="h-5 bg-zinc-200 flex items-center px-1.5 gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      </div>
                      <div className="p-2 space-y-1.5">
                        <div className="h-2.5 w-3/4 bg-zinc-800 rounded-xs" />
                        <div className="h-8 rounded border border-zinc-200 bg-zinc-50 p-1">
                          <div className="h-1.5 w-1/2 bg-zinc-400 rounded-xs mb-1" />
                          <div className="h-1 w-2/3 bg-zinc-300 rounded-xs" />
                        </div>
                      </div>
                    </div>

                    {/* Right half: Dark */}
                    <div className="w-1/2 h-full bg-zinc-950 flex flex-col">
                      <div className="h-5 bg-zinc-900 flex items-center px-1.5 gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <div className="p-2 space-y-1.5">
                        <div className="h-2.5 w-3/4 bg-zinc-200 rounded-xs" />
                        <div className="h-8 rounded border border-zinc-800 bg-zinc-900 p-1">
                          <div className="h-1.5 w-1/2 bg-zinc-400 rounded-xs mb-1" />
                          <div className="h-1 w-2/3 bg-zinc-600 rounded-xs" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Info */}
              <div className="flex items-center gap-2 mb-1">
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className="text-sm font-semibold text-foreground">{option.title}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
