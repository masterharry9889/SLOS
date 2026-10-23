'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { subscribeToJob } from '@/lib/sse';
import { getJob } from '@/lib/api/endpoints';
import type { Job, JobStatus } from '@/types';

export interface UseJobReturn {
  status: 'idle' | JobStatus;
  progress: number;
  currentStep?: string;
  result?: unknown;
  error: string | null;
  job: Job | null;
  reset: () => void;
  retry: () => void;
}

export function useJob(jobId: string | null): UseJobReturn {
  const [status, setStatus] = useState<'idle' | JobStatus>(jobId ? 'pending' : 'idle');
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<unknown>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);

  const activeSubscriptionRef = useRef<{ close: () => void } | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isDoneRef = useRef(false);

  const reset = useCallback(() => {
    if (activeSubscriptionRef.current) {
      activeSubscriptionRef.current.close();
      activeSubscriptionRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isDoneRef.current = false;
    setStatus('idle');
    setProgress(0);
    setCurrentStep(undefined);
    setResult(undefined);
    setError(null);
    setJob(null);
  }, []);

  const startTracking = useCallback((id: string) => {
    isDoneRef.current = false;
    setStatus('pending');
    setProgress(0);
    setError(null);
    setResult(undefined);

    // 1. Initial snapshot check via GET /jobs/:id
    getJob(id)
      .then((initialJob) => {
        if (!initialJob) return;
        setJob(initialJob);

        if (initialJob.status === 'completed') {
          isDoneRef.current = true;
          setStatus('completed');
          setProgress(100);
          setCurrentStep('Complete');
          setResult(initialJob.result);
          return;
        }

        if (initialJob.status === 'failed') {
          isDoneRef.current = true;
          setStatus('failed');
          setError(initialJob.error || 'Job failed');
          return;
        }

        setStatus('running');
        if (typeof initialJob.progress === 'number') {
          setProgress(initialJob.progress);
        }
        if (initialJob.current_step) {
          setCurrentStep(initialJob.current_step);
        }
      })
      .catch(() => {
        // Continue to SSE even if initial poll fails
      });

    // 2. Subscribe to real-time events via SSE
    try {
      const sub = subscribeToJob(id, {
        onProgress: (p, step) => {
          if (isDoneRef.current) return;
          setStatus('running');
          setProgress(p);
          if (step) setCurrentStep(step);
        },
        onComplete: (res) => {
          isDoneRef.current = true;
          setStatus('completed');
          setProgress(100);
          setCurrentStep('Complete');
          setResult(res);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        },
        onError: (errMessage) => {
          // If SSE reports an error or disconnects, keep backup polling active
          if (isDoneRef.current) return;
          console.warn(`Job SSE event notice: ${errMessage}`);
        },
      });

      activeSubscriptionRef.current = sub;
    } catch {
      // SSE creation error, fallback polling will handle it
    }

    // 3. Fallback polling every 2.5 seconds to guarantee progression across networks
    pollingIntervalRef.current = setInterval(async () => {
      if (isDoneRef.current) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        return;
      }

      try {
        const polledJob = await getJob(id);
        if (!polledJob) return;

        setJob(polledJob);

        if (polledJob.status === 'completed') {
          isDoneRef.current = true;
          setStatus('completed');
          setProgress(100);
          setCurrentStep('Complete');
          setResult(polledJob.result);
          if (activeSubscriptionRef.current) {
            activeSubscriptionRef.current.close();
          }
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (polledJob.status === 'failed') {
          isDoneRef.current = true;
          setStatus('failed');
          setError(polledJob.error || 'Job failed');
          if (activeSubscriptionRef.current) {
            activeSubscriptionRef.current.close();
          }
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else {
          setStatus('running');
          if (typeof polledJob.progress === 'number' && polledJob.progress > 0) {
            setProgress((prev) => Math.max(prev, polledJob.progress));
          }
          if (polledJob.current_step) {
            setCurrentStep(polledJob.current_step);
          }
        }
      } catch {
        // Polling retry
      }
    }, 2500);
  }, []);

  const retry = useCallback(() => {
    if (jobId) {
      if (activeSubscriptionRef.current) {
        activeSubscriptionRef.current.close();
        activeSubscriptionRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      startTracking(jobId);
    }
  }, [jobId, startTracking]);

  useEffect(() => {
    if (!jobId) {
      reset();
      return;
    }

    startTracking(jobId);

    return () => {
      if (activeSubscriptionRef.current) {
        activeSubscriptionRef.current.close();
        activeSubscriptionRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [jobId, startTracking, reset]);

  return {
    status,
    progress,
    currentStep,
    result,
    error,
    job,
    reset,
    retry,
  };
}
