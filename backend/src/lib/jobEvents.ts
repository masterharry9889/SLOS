export type JobStreamEvent = {
  jobId: string;
  status: string;
  result?: unknown;
  error?: string | null;
};

const subscribers = new Map<string, Set<(event: JobStreamEvent) => void>>();

export function subscribeToJob(jobId: string, handler: (event: JobStreamEvent) => void): () => void {
  const listeners = subscribers.get(jobId) ?? new Set();
  listeners.add(handler);
  subscribers.set(jobId, listeners);

  return () => {
    const active = subscribers.get(jobId);
    if (!active) {
      return;
    }

    active.delete(handler);
    if (active.size === 0) {
      subscribers.delete(jobId);
    }
  };
}

export function emitJobUpdate(jobId: string, event: JobStreamEvent): void {
  for (const handler of subscribers.get(jobId) ?? []) {
    handler(event);
  }
}
