'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Minimize2,
  Maximize2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudyTimer } from '@/hooks/useStudyTimer';

interface StudyTimerProps {
  subjectId: string;
  chapterId: string;
  chapterTitle?: string;
  className?: string;
}

export function StudyTimer({
  subjectId,
  chapterId,
  chapterTitle,
  className,
}: StudyTimerProps) {
  const { isRunning, elapsedSeconds, formattedTime, start, pause, stop, reset } =
    useStudyTimer(subjectId, chapterId);

  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Keyboard shortcut: Space to pause/resume (when not focused in an input/textarea)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const active = document.activeElement;
        const isInputField =
          active?.tagName === 'INPUT' ||
          active?.tagName === 'TEXTAREA' ||
          (active as HTMLElement)?.isContentEditable;

        if (!isInputField) {
          e.preventDefault();
          if (isRunning) {
            pause();
          } else {
            start();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, pause, start]);

  const handleStopAndLog = async () => {
    await stop();
  };

  return (
    <aside
      aria-label="Study timer"
      className={cn(
        'fixed bottom-5 left-1/2 -translate-x-1/2 z-40 print:hidden transition-all duration-300 ease-in-out',
        className
      )}
    >
      {/* Minimized Pill View */}
      {isMinimized ? (
        <div className="flex items-center gap-2.5 rounded-full border border-border bg-card/95 backdrop-blur-md px-3.5 py-1.5 shadow-lg">
          <div className="relative flex items-center justify-center">
            <span
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                isRunning ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
              )}
            />
            <span
              className={cn(
                'absolute h-2 w-2 rounded-full',
                isRunning ? 'bg-emerald-500' : 'bg-amber-500'
              )}
            />
          </div>

          <span className="font-mono text-xs font-bold text-foreground tracking-tight">
            {formattedTime}
          </span>

          <div className="flex items-center gap-1 border-l border-border/80 pl-2">
            <button
              type="button"
              onClick={isRunning ? pause : start}
              className="rounded-full p-1 hover:bg-muted text-foreground transition-colors cursor-pointer"
              title={isRunning ? 'Pause (Space)' : 'Start (Space)'}
            >
              {isRunning ? (
                <Pause className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <Play className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/20" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="rounded-full p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Expand study timer"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Expanded Floating Timer Bar */
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 rounded-2xl border border-border bg-card/95 backdrop-blur-md px-5 py-3 shadow-xl max-w-xl w-full">
          {/* Status Indicator & Chapter info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  isRunning
                    ? 'bg-emerald-500 animate-ping'
                    : elapsedSeconds > 0
                    ? 'bg-amber-500'
                    : 'bg-muted-foreground/40'
                )}
              />
              <span
                className={cn(
                  'absolute h-2.5 w-2.5 rounded-full',
                  isRunning
                    ? 'bg-emerald-500'
                    : elapsedSeconds > 0
                    ? 'bg-amber-500'
                    : 'bg-muted-foreground/40'
                )}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-primary shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isRunning ? 'Studying Now' : elapsedSeconds > 0 ? 'Paused' : 'Study Timer'}
                </span>
              </div>
              <p className="text-xs font-semibold text-foreground truncate max-w-[160px] sm:max-w-[200px]">
                {chapterTitle || 'Active Chapter'}
              </p>
            </div>
          </div>

          {/* Time Display with animated pulse when running */}
          <div className="flex items-center gap-1">
            <div
              className={cn(
                'rounded-xl px-3 py-1 font-mono text-xl sm:text-2xl font-black tracking-wider transition-all',
                isRunning
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-2xs'
                  : 'bg-muted text-foreground'
              )}
            >
              {formattedTime}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isRunning ? (
              <button
                type="button"
                onClick={pause}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
                title="Pause (Space)"
              >
                <Pause className="h-3.5 w-3.5" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={start}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                title="Start (Space)"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{elapsedSeconds > 0 ? 'Resume' : 'Start'}</span>
              </button>
            )}

            {elapsedSeconds > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleStopAndLog}
                  className="inline-flex items-center gap-1 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                  title="Stop and save session to profile"
                >
                  <Square className="h-3 w-3 fill-current" />
                  <span className="hidden sm:inline">Save</span>
                </button>

                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Reset timer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {/* Keyboard shortcut badge */}
            <span
              className="hidden lg:inline-block rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
              title="Press spacebar anywhere on the page to toggle pause/resume"
            >
              Space
            </span>

            {/* Minimize toggle */}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="rounded-xl p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer ml-1"
              title="Minimize timer"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
