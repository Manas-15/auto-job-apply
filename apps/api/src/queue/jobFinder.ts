import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { discoverJobs } from '../modules/finder/service.js';

const QUEUE_NAME = 'job-finder';

// Pass connection options and let BullMQ create the ioredis client (avoids
// clashing with any other ioredis version in the tree). maxRetriesPerRequest
// must be null for BullMQ.
function connection(): ConnectionOptions {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    maxRetriesPerRequest: null,
  };
}

let queue: Queue | null = null;
let worker: Worker | null = null;

interface ScanData {
  query: string;
  limit: number;
}

/**
 * Start the Job Finder background worker + repeatable scan. Opt-in via
 * JOB_FINDER_ENABLED so local dev doesn't hammer external APIs unless
 * you ask it to. The manual POST /api/jobs/discover works regardless.
 */
export async function startJobFinder(): Promise<void> {
  if (!env.JOB_FINDER_ENABLED) {
    logger.info('Job Finder scheduler disabled (set JOB_FINDER_ENABLED=true to enable).');
    return;
  }

  queue = new Queue(QUEUE_NAME, { connection: connection() });

  worker = new Worker<ScanData>(
    QUEUE_NAME,
    async (job) => discoverJobs({ query: job.data.query, limit: job.data.limit }),
    { connection: connection() },
  );

  worker.on('completed', (job, result) =>
    logger.info({ jobId: job.id, result }, 'Scheduled job scan completed'),
  );
  worker.on('failed', (job, err) =>
    logger.error({ jobId: job?.id, err }, 'Scheduled job scan failed'),
  );

  const everyMs = env.JOB_FINDER_INTERVAL_MIN * 60_000;
  await queue.upsertJobScheduler(
    'recurring-scan',
    { every: everyMs },
    {
      name: 'scan',
      data: { query: env.JOB_FINDER_QUERY, limit: env.JOB_FINDER_LIMIT },
    },
  );

  logger.info(
    `🔎 Job Finder scheduled every ${env.JOB_FINDER_INTERVAL_MIN} min (query: "${env.JOB_FINDER_QUERY}").`,
  );
}

export async function stopJobFinder(): Promise<void> {
  await worker?.close();
  await queue?.close();
}
