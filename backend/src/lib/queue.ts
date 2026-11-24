import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { config } from '@/config.js';

export const JOB_QUEUE_NAME = 'slos-jobs';

export interface BackgroundJobData {
  jobId: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
}

let connection: Redis | undefined;
let queue: Queue<BackgroundJobData> | undefined;

export function getQueue(): Queue<BackgroundJobData> {
  if (!queue) {
    connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
    queue = new Queue<BackgroundJobData>(JOB_QUEUE_NAME, { connection });
  }
  return queue;
}

export async function enqueueJob(data: BackgroundJobData): Promise<void> {
  await getQueue().add(data.type, data, {
    jobId: data.jobId,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}

export async function closeQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = undefined;
  }
  if (connection) {
    await connection.quit();
    connection = undefined;
  }
}
