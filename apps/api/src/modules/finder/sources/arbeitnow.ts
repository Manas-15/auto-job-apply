import { htmlToText } from '../html.js';
import type { FetchOptions, JobSourceAdapter, RawJob } from '../types.js';

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number;
}

/**
 * Arbeitnow — free public job-board API (EU/global), no key required.
 * https://www.arbeitnow.com/api/job-board-api
 * No server-side search, so we filter client-side by the query terms.
 */
export const arbeitnowSource: JobSourceAdapter = {
  key: 'OTHER',
  label: 'Arbeitnow',

  async fetch({ query, limit }: FetchOptions): Promise<RawJob[]> {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      headers: { 'User-Agent': 'auto-job-apply/0.1' },
    });
    if (!res.ok) throw new Error(`Arbeitnow request failed (${res.status})`);

    const data = (await res.json()) as { data?: ArbeitnowJob[] };
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

    return (data.data ?? [])
      .filter((j) => {
        if (terms.length === 0) return true;
        const hay = `${j.title} ${(j.tags ?? []).join(' ')} ${j.description}`.toLowerCase();
        return terms.some((t) => hay.includes(t));
      })
      .slice(0, limit)
      .map((j) => ({
        source: 'OTHER',
        externalId: `arbeitnow:${j.slug}`,
        title: j.title,
        company: j.company_name || null,
        location: j.location || (j.remote ? 'Remote' : null),
        url: j.url,
        salaryText: null,
        descriptionRaw: htmlToText(j.description ?? ''),
        postedAt: j.created_at ? new Date(j.created_at * 1000) : null,
        workMode: j.remote ? 'REMOTE' : 'ONSITE',
      }));
  },
};
