import { htmlToText } from '../html.js';
import type { FetchOptions, JobSourceAdapter, RawJob } from '../types.js';

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  candidate_required_location: string;
  salary: string;
  description: string;
  publication_date: string;
}

/**
 * Remotive — free public JSON API of remote jobs, no key required.
 * https://remotive.com/api/remote-jobs?search=react
 */
export const remotiveSource: JobSourceAdapter = {
  key: 'OTHER',
  label: 'Remotive',

  async fetch({ query, limit }: FetchOptions): Promise<RawJob[]> {
    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'auto-job-apply/0.1' } });
    if (!res.ok) throw new Error(`Remotive request failed (${res.status})`);

    const data = (await res.json()) as { jobs?: RemotiveJob[] };
    return (data.jobs ?? []).slice(0, limit).map((j) => ({
      source: 'OTHER',
      externalId: `remotive:${j.id}`,
      title: j.title,
      company: j.company_name || null,
      location: j.candidate_required_location || 'Remote',
      url: j.url,
      salaryText: j.salary || null,
      descriptionRaw: htmlToText(j.description ?? ''),
      postedAt: j.publication_date ? new Date(j.publication_date) : null,
      workMode: 'REMOTE',
    }));
  },
};
