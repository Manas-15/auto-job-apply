import { XMLParser } from 'fast-xml-parser';
import { htmlToText } from '../html.js';
import type { FetchOptions, JobSourceAdapter, RawJob } from '../types.js';

interface WwrItem {
  title?: string;
  link?: string;
  guid?: string | { '#text'?: string };
  description?: string;
  region?: string;
  category?: string;
  pubDate?: string;
}

// Don't expand entities: the feed is heavily entity-encoded and trips the
// parser's expansion guard. htmlToText decodes entities itself.
const parser = new XMLParser({ processEntities: false });

/**
 * We Work Remotely — RSS feed of remote programming jobs, no key
 * required. Titles are "Company: Job Title"; all roles are remote.
 * https://weworkremotely.com/categories/remote-programming-jobs.rss
 */
export const weWorkRemotelySource: JobSourceAdapter = {
  key: 'OTHER',
  label: 'WeWorkRemotely',

  async fetch({ query, limit }: FetchOptions): Promise<RawJob[]> {
    const res = await fetch(
      'https://weworkremotely.com/categories/remote-programming-jobs.rss',
      { headers: { 'User-Agent': 'auto-job-apply/0.1' } },
    );
    if (!res.ok) throw new Error(`WeWorkRemotely request failed (${res.status})`);

    const xml = await res.text();
    const parsed = parser.parse(xml) as { rss?: { channel?: { item?: WwrItem | WwrItem[] } } };
    const raw = parsed.rss?.channel?.item;
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

    return items
      .filter((it) => {
        if (terms.length === 0) return true;
        const hay = `${it.title ?? ''} ${it.category ?? ''} ${it.description ?? ''}`.toLowerCase();
        return terms.some((t) => hay.includes(t));
      })
      .slice(0, limit)
      .map((it) => {
        const rawTitle = it.title ?? '';
        const [companyPart, ...titleParts] = rawTitle.split(': ');
        const hasCompany = titleParts.length > 0;
        const title = (hasCompany ? titleParts.join(': ') : rawTitle).trim();
        const company = hasCompany ? companyPart!.trim() : null;
        const link = it.link ?? '';
        const slug = link.split('/').filter(Boolean).pop() ?? link;

        return {
          source: 'OTHER',
          externalId: `wwr:${slug}`,
          title: title || rawTitle,
          company,
          location: it.region || 'Remote',
          url: link,
          salaryText: null,
          descriptionRaw: htmlToText(it.description ?? ''),
          postedAt: it.pubDate ? new Date(it.pubDate) : null,
          workMode: 'REMOTE',
        } satisfies RawJob;
      });
  },
};
