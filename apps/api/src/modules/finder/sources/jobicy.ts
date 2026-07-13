import { htmlToText } from '../html.js';
import type { FetchOptions, JobSourceAdapter, RawJob } from '../types.js';

interface JobicyJob {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  jobGeo: string;
  jobLevel: string;
  jobExcerpt: string;
  jobDescription: string;
  pubDate: string;
  annualSalaryMin?: number;
  annualSalaryMax?: number;
  salaryCurrency?: string;
}

/**
 * Jobicy — free remote-jobs API, no key required. Supports a `tag`
 * search term. https://jobicy.com/api/v2/remote-jobs?tag=react
 */
export const jobicySource: JobSourceAdapter = {
  key: 'OTHER',
  label: 'Jobicy',

  async fetch({ query, limit }: FetchOptions): Promise<RawJob[]> {
    const count = Math.min(50, Math.max(limit, 20));
    const url = `https://jobicy.com/api/v2/remote-jobs?count=${count}&tag=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'auto-job-apply/0.1' } });
    if (!res.ok) throw new Error(`Jobicy request failed (${res.status})`);

    const data = (await res.json()) as { jobs?: JobicyJob[] };
    return (data.jobs ?? []).slice(0, limit).map((j) => ({
      source: 'OTHER',
      externalId: `jobicy:${j.id}`,
      title: j.jobTitle,
      company: j.companyName || null,
      location: j.jobGeo || 'Remote',
      url: j.url,
      salaryText: formatSalary(j.annualSalaryMin, j.annualSalaryMax, j.salaryCurrency),
      descriptionRaw: htmlToText(j.jobDescription || j.jobExcerpt || ''),
      postedAt: j.pubDate ? new Date(j.pubDate) : null,
      workMode: 'REMOTE',
    }));
  },
};

function formatSalary(min?: number, max?: number, currency?: string): string | null {
  if (!min && !max) return null;
  const cur = currency || 'USD';
  const fmt = (n: number) => `${cur} ${Math.round(n / 1000)}k`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  return fmt((min || max)!);
}
