import { htmlToText } from '../html.js';
import type { FetchOptions, JobSourceAdapter, RawJob } from '../types.js';

interface RemoteOkJob {
  id?: string;
  slug?: string;
  position?: string;
  company?: string;
  tags?: string[];
  description?: string;
  url?: string;
  location?: string;
  date?: string;
  salary_min?: number;
  salary_max?: number;
}

/**
 * RemoteOK — free public JSON feed of remote jobs, no key required.
 * https://remoteok.com/api  (first array element is a legal notice)
 * The API has no server-side search, so we filter client-side by query.
 */
export const remoteOkSource: JobSourceAdapter = {
  key: 'OTHER',
  label: 'RemoteOK',

  async fetch({ query, limit }: FetchOptions): Promise<RawJob[]> {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'auto-job-apply/0.1' },
    });
    if (!res.ok) throw new Error(`RemoteOK request failed (${res.status})`);

    const raw = (await res.json()) as RemoteOkJob[];
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

    const jobs = raw
      .filter((j) => j.id && j.position) // drop the legal-notice entry
      .filter((j) => {
        if (terms.length === 0) return true;
        const hay = `${j.position} ${(j.tags ?? []).join(' ')} ${j.company ?? ''}`.toLowerCase();
        return terms.some((t) => hay.includes(t));
      })
      .slice(0, limit);

    return jobs.map((j) => ({
      source: 'OTHER',
      externalId: `remoteok:${j.id}`,
      title: j.position!,
      company: j.company || null,
      location: j.location || 'Remote',
      url: j.url || `https://remoteok.com/l/${j.id}`,
      salaryText: formatSalary(j.salary_min, j.salary_max),
      descriptionRaw: htmlToText(j.description ?? ''),
      postedAt: j.date ? new Date(j.date) : null,
      workMode: 'REMOTE',
    }));
  },
};

function formatSalary(min?: number, max?: number): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  return fmt((min || max)!);
}
