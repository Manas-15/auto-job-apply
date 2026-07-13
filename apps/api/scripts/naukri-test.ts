import { scrapeNaukri } from '../src/modules/finder/naukri/scraper.js';

const query = process.argv[2] ?? 'react developer';
const headed = process.argv.includes('--headed');
const jobs = await scrapeNaukri({ query, limit: 10, headed });

// eslint-disable-next-line no-console
console.log(`\nFound ${jobs.length} jobs for "${query}"\n`);
for (const j of jobs.slice(0, 8)) {
  // eslint-disable-next-line no-console
  console.log(`• ${j.title} — ${j.company ?? '?'} | ${j.location ?? '?'}${j.salaryText ? ` | ${j.salaryText}` : ''}`);
  // eslint-disable-next-line no-console
  console.log(`  ${j.url}`);
}
process.exit(0);
