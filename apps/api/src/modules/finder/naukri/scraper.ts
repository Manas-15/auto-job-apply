import path from 'node:path';
import { AppError } from '../../../lib/errors.js';
import { logger } from '../../../lib/logger.js';
import { hasSession, launchContext } from '../../../browser/session.js';
import { htmlToText } from '../html.js';
import type { RawJob } from '../types.js';

interface ScrapeOptions {
  query: string;
  limit: number;
  /** Force a visible browser — often required to pass Naukri's bot check. */
  headed?: boolean;
}

/** Shape returned from the in-page DOM extraction. */
interface CardData {
  jobId: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  experience: string | null;
  salary: string | null;
  url: string | null;
  desc: string | null;
}

/**
 * Scrape Naukri search results using your saved login session (run
 * `npm run naukri:login` first). Runs on YOUR machine under YOUR account.
 * Selectors are best-effort and defensive — Naukri changes its markup
 * often, so if a run returns 0 jobs we dump a screenshot + HTML to help
 * re-tune them rather than failing silently.
 */
export async function scrapeNaukri({ query, limit, headed }: ScrapeOptions): Promise<RawJob[]> {
  if (!hasSession('naukri')) {
    throw new AppError(
      400,
      'No Naukri session found. Run `npm run naukri:login --workspace @aja/api` and sign in first.',
    );
  }

  const slug = query.trim().toLowerCase().replace(/\s+/g, '-');
  const searchUrl = `https://www.naukri.com/${slug}-jobs`;

  const { context, close } = await launchContext({ site: 'naukri', headed });
  try {
    const page = await context.newPage();

    // When run under tsx/esbuild, page.evaluate callbacks are transformed with
    // a `__name` helper that doesn't exist in the browser. Define a no-op shim
    // in the page context so those references resolve. (Passed as a string so
    // esbuild doesn't transform this line too.)
    await page.addInitScript(
      'window.__name = window.__name || function (fn) { return fn; };',
    );

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });

    // If the session expired, Naukri bounces us to the login page.
    if (/\/(nlogin|login)/i.test(page.url())) {
      throw new AppError(401, 'Naukri session expired. Re-run `npm run naukri:login`.');
    }

    // Wait for the job list to render (client-side). Tolerate either the
    // current or older card container class.
    await page
      .waitForSelector('.srp-jobtuple-wrapper, article.jobTuple, [data-job-id]', {
        timeout: 20_000,
      })
      .catch(() => undefined);

    const cards = await page.evaluate((): CardData[] => {
      const pick = (root: Element, sels: string[]): string | null => {
        for (const s of sels) {
          const el = root.querySelector(s);
          const t = el?.textContent?.trim();
          if (t) return t;
        }
        return null;
      };
      const pickAttr = (root: Element, sels: string[], attr: string): string | null => {
        for (const s of sels) {
          const el = root.querySelector(s);
          const v = el?.getAttribute(attr);
          if (v) return v;
        }
        return null;
      };

      const containers = Array.from(
        document.querySelectorAll('.srp-jobtuple-wrapper, article.jobTuple'),
      );

      return containers.map((c) => ({
        jobId: c.getAttribute('data-job-id') ?? pickAttr(c, ['[data-job-id]'], 'data-job-id'),
        title: pick(c, ['a.title', '.title', 'a.jobTupleHeader']),
        company: pick(c, ['a.comp-name', '.comp-name', '.subTitle', 'a.subTitle']),
        location: pick(c, ['.locWdth', '.loc', 'span.locWdth', '.location']),
        experience: pick(c, ['.expwdth', '.exp', 'span.expwdth']),
        salary: pick(c, ['.sal', '.salary', 'span.sal-wrap']),
        url: pickAttr(c, ['a.title', 'a.jobTupleHeader', 'a[href*="job-listings"]'], 'href'),
        desc: pick(c, ['.job-desc', '.job-description']),
      }));
    });

    if (cards.length === 0) {
      const shot = path.resolve(process.cwd(), 'browser-sessions', 'naukri-debug.png');
      await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined);
      logger.warn(
        { searchUrl, shot },
        'Naukri returned 0 job cards — selectors may have changed. Screenshot saved for tuning.',
      );
      return [];
    }

    const jobs: RawJob[] = cards.slice(0, limit).flatMap((c) => {
      if (!c.title || !c.url) return [];
      const externalId = `naukri:${c.jobId ?? c.url}`;
      const loc = [c.location, c.experience].filter(Boolean).join(' · ') || null;
      return [
        {
          source: 'NAUKRI',
          externalId,
          title: c.title,
          company: c.company,
          location: loc,
          url: c.url.startsWith('http') ? c.url : `https://www.naukri.com${c.url}`,
          salaryText: c.salary,
          descriptionRaw: c.desc ?? '',
          postedAt: null,
          workMode: 'UNKNOWN',
        } satisfies RawJob,
      ];
    });

    // Enrich each job from its detail page: the listing only has a snippet,
    // but the detail page embeds a full JobPosting JSON-LD (description +
    // datePosted + salary). Sequential + small delays to stay polite.
    for (const job of jobs) {
      try {
        const detail = await fetchDetail(page, job.url);
        if (detail.description) job.descriptionRaw = detail.description;
        if (detail.postedAt) job.postedAt = detail.postedAt;
        if (!job.salaryText && detail.salary) job.salaryText = detail.salary;
        await page.waitForTimeout(1000); // be gentle
      } catch (err) {
        logger.warn({ url: job.url, err: (err as Error).message }, 'Naukri detail enrich failed');
      }
    }

    logger.info({ query, found: jobs.length }, 'Naukri scrape complete');
    return jobs;
  } finally {
    await close();
  }
}

interface JobPostingLd {
  '@type'?: string | string[];
  description?: string;
  datePosted?: string;
  baseSalary?: { value?: { value?: string | number; minValue?: number; maxValue?: number } };
}

/** Open a Naukri job detail page and pull its JobPosting JSON-LD. */
async function fetchDetail(
  page: import('playwright').Page,
  url: string,
): Promise<{ description: string | null; postedAt: Date | null; salary: string | null }> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page
    .waitForSelector('script[type="application/ld+json"]', { timeout: 15_000 })
    .catch(() => undefined);

  const blobs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
      (s) => s.textContent ?? '',
    ),
  );

  let posting: JobPostingLd | null = null;
  for (const raw of blobs) {
    try {
      const parsed = JSON.parse(raw) as JobPostingLd;
      const t = parsed['@type'];
      const isJob = Array.isArray(t) ? t.includes('JobPosting') : t === 'JobPosting';
      if (isJob) {
        posting = parsed;
        break;
      }
    } catch {
      /* not valid JSON — skip */
    }
  }

  if (!posting) return { description: null, postedAt: null, salary: null };

  const description = posting.description ? htmlToText(posting.description) : null;
  const postedAt = posting.datePosted ? new Date(posting.datePosted) : null;
  const sv = posting.baseSalary?.value;
  const salary =
    sv?.minValue && sv?.maxValue
      ? `${sv.minValue}–${sv.maxValue}`
      : sv?.value
        ? String(sv.value)
        : null;

  return {
    description,
    postedAt: postedAt && !Number.isNaN(postedAt.getTime()) ? postedAt : null,
    salary,
  };
}
