import { BadRequestError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { defaultSourceKeys, sources } from './sources/index.js';
import type { RawJob } from './types.js';

export interface DiscoverOptions {
  query: string;
  limit: number;
  sourceKeys?: string[];
}

export interface DiscoverResult {
  query: string;
  fetched: number;
  created: number;
  updated: number;
  perSource: { source: string; fetched: number; error?: string }[];
}

/**
 * Job Finder (M1): pull jobs from the selected free sources, normalize,
 * dedupe, and upsert into the database. Idempotent — re-running updates
 * existing rows (matched on source + externalId) instead of duplicating.
 */
export async function discoverJobs(opts: DiscoverOptions): Promise<DiscoverResult> {
  const keys = opts.sourceKeys?.length ? opts.sourceKeys : defaultSourceKeys;
  const unknown = keys.filter((k) => !sources[k]);
  if (unknown.length) throw new BadRequestError(`Unknown source(s): ${unknown.join(', ')}`);

  const perSource: DiscoverResult['perSource'] = [];
  const all: RawJob[] = [];

  // Fetch every source independently; one failing source shouldn't abort the rest.
  await Promise.all(
    keys.map(async (key) => {
      try {
        const jobs = await sources[key]!.fetch({ query: opts.query, limit: opts.limit });
        all.push(...jobs);
        perSource.push({ source: key, fetched: jobs.length });
      } catch (err) {
        logger.warn({ err, source: key }, 'Job source fetch failed');
        perSource.push({ source: key, fetched: 0, error: (err as Error).message });
      }
    }),
  );

  const { fetched, created, updated } = await ingestRawJobs(all);

  const result: DiscoverResult = { query: opts.query, fetched, created, updated, perSource };
  logger.info(result, 'Job discovery complete');
  return result;
}

/**
 * Dedupe a batch of raw jobs (by externalId) and upsert them, matching on
 * (source, externalId) so re-runs update instead of duplicating. Shared by
 * the fetch-based sources and the Playwright scrapers (Naukri, etc.).
 */
export async function ingestRawJobs(
  jobs: RawJob[],
): Promise<{ fetched: number; created: number; updated: number }> {
  const seen = new Set<string>();
  const unique = jobs.filter((j) => {
    if (seen.has(j.externalId)) return false;
    seen.add(j.externalId);
    return true;
  });

  let created = 0;
  let updated = 0;

  for (const raw of unique) {
    const company = raw.company
      ? await prisma.company.upsert({
          where: { name: raw.company },
          create: { name: raw.company },
          update: {},
        })
      : null;

    const existing = await prisma.job.findUnique({
      where: { source_externalId: { source: raw.source, externalId: raw.externalId } },
      select: { id: true },
    });

    const data = {
      title: raw.title,
      url: raw.url,
      location: raw.location,
      workMode: raw.workMode,
      salaryText: raw.salaryText,
      descriptionRaw: raw.descriptionRaw,
      postedAt: raw.postedAt,
      companyId: company?.id ?? null,
    };

    if (existing) {
      await prisma.job.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.job.create({
        data: { source: raw.source, externalId: raw.externalId, ...data },
      });
      created += 1;
    }
  }

  return { fetched: unique.length, created, updated };
}
