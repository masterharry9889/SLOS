'use client';

import { useEffect, useCallback } from 'react';
import { useStudyTimerStore } from '@/store';
import { logStudySession } from '@/lib/api/endpoints';
import { useToast } from '@/components/ui/toaster';

export interface UseStudyTimerReturn {
  isRunning: boolean;
  elapsed: number;
  elapsedSeconds: number;
  formattedTime: string;
  start: () => void;
  pause: () => void;
  stop: () => Promise<void>;
  reset: () => void;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs.toString().padStart(2, '0')}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Hook to manage study sessions and study timer for a subject & chapter.
 * Integrates with Zustand's useStudyTimerStore and logs completed sessions to the backend API.
 */
export function useStudyTimer(subjectId: string, chapterId: string): UseStudyTimerReturn {
  const isRunning = useStudyTimerStore((state) => state.isRunning);
  const elapsedSeconds = useStudyTimerStore((state) => state.elapsedSeconds);
  const currentChapterId = useStudyTimerStore((state) => state.chapterId);
  const currentSubjectId = useStudyTimerStore((state) => state.subjectId);
  const storeStart = useStudyTimerStore((state) => state.start);
  const storePause = useStudyTimerStore((state) => state.pause);
  const storeStop = useStudyTimerStore((state) => state.stop);
  const storeReset = useStudyTimerStore((state) => state.reset);
  const tick = useStudyTimerStore((state) => state.tick);

  const { addToast } = useToast();

  const isCurrentTarget = currentChapterId === chapterId && currentSubjectId === subjectId;
  const activeRunning = isRunning && isCurrentTarget;
  const currentElapsed = isCurrentTarget ? elapsedSeconds : 0;

  // Interval timer for ticking
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeRunning) {
      interval = setInterval(() => {
        tick();
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeRunning, tick]);

  const start = useCallback(() => {
    storeStart(subjectId, chapterId);
  }, [storeStart, subjectId, chapterId]);

  const pause = useCallback(() => {
    storePause();
  }, [storePause]);

  const reset = useCallback(() => {
    storeReset();
  }, [storeReset]);

  const stop = useCallback(async () => {
    const duration = isCurrentTarget ? elapsedSeconds : 0;
    storeStop();
    storeReset();

    // Log to API if session was longer than 5 seconds
    if (duration >= 5) {
      try {
        await logStudySession({
          subject_id: subjectId,
          chapter_id: chapterId,
          duration_seconds: duration,
        });
        const mins = Math.max(1, Math.round(duration / 60));
        addToast(
          `Logged ${mins} min${mins === 1 ? '' : 's'} study session!`,
          'success',
          'Study Session Saved'
        );
      } catch (err: unknown) {
        console.error('Failed to log study session:', err);
        addToast('Could not save session to server, logged locally.', 'warning');
      }
    }
  }, [isCurrentTarget, elapsedSeconds, storeStop, storeReset, subjectId, chapterId, addToast]);

  return {
    isRunning: activeRunning,
    elapsed: currentElapsed,
    elapsedSeconds: currentElapsed,
    formattedTime: formatTime(currentElapsed),
    start,
    pause,
    stop,
    reset,
  };
}
