import { scrapeNaukri } from '../src/modules/finder/naukri/scraper.js';

const query = process.argv[2] ?? 'react developer';
const limit = Number(process.argv[3] ?? '5');
const headed = !process.argv.includes('--headless'); // headed by default (Naukri blocks headless)

const jobs = await scrapeNaukri({ query, limit, headed });

// eslint-disable-next-line no-console
console.log(`\nFound ${jobs.length} jobs for "${query}"\n`);
for (const j of jobs) {
  const desc = (j.descriptionRaw ?? '').replace(/\n/g, ' ');
  // eslint-disable-next-line no-console
  console.log(`• ${j.title} — ${j.company ?? '?'} | ${j.location ?? '?'}${j.salaryText ? ` | ${j.salaryText}` : ''}`);
  // eslint-disable-next-line no-console
  console.log(`  posted: ${j.postedAt?.toISOString().slice(0, 10) ?? 'n/a'} | desc: ${desc.length} chars`);
  // eslint-disable-next-line no-console
  console.log(`  ${desc.slice(0, 160)}…`);
}
process.exit(0);
