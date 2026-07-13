import path from 'node:path';
import { AppError } from '../../../lib/errors.js';
import { logger } from '../../../lib/logger.js';
import { hasSession, launchContext } from '../../../browser/session.js';
import type { RawJob } from '../types.js';

interface ScrapeOptions {
  query: string;
  limit: number;
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
export async function scrapeNaukri({ query, limit }: ScrapeOptions): Promise<RawJob[]> {
  if (!hasSession('naukri')) {
    throw new AppError(
      400,
      'No Naukri session found. Run `npm run naukri:login --workspace @aja/api` and sign in first.',
    );
  }

  const slug = query.trim().toLowerCase().replace(/\s+/g, '-');
  const searchUrl = `https://www.naukri.com/${slug}-jobs`;

  const { context, close } = await launchContext({ site: 'naukri' });
  try {
    const page = await context.newPage();
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

    logger.info({ query, found: jobs.length }, 'Naukri scrape complete');
    return jobs;
  } finally {
    await close();
  }
}
