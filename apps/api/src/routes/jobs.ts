import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { analyzeJob } from '../modules/analyzer/service.js';
import { discoverJobs, ingestRawJobs } from '../modules/finder/service.js';
import { defaultSourceKeys } from '../modules/finder/sources/index.js';
import { scrapeNaukri } from '../modules/finder/naukri/scraper.js';
import { env } from '../config/env.js';

export const jobsRouter = Router();

// Run the Job Finder now (M1): pull real jobs from free sources.
const discoverSchema = z.object({
  query: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sources: z.array(z.string()).optional(),
});

jobsRouter.post(
  '/discover',
  asyncHandler(async (req, res) => {
    const body = discoverSchema.parse(req.body ?? {});
    const result = await discoverJobs({
      query: body.query ?? env.JOB_FINDER_QUERY,
      limit: body.limit ?? env.JOB_FINDER_LIMIT,
      sourceKeys: body.sources,
    });
    res.json(result);
  }),
);

// List available job sources.
jobsRouter.get('/sources', (_req, res) => {
  res.json({ sources: defaultSourceKeys });
});

// Scrape Naukri using your saved login session (run `npm run naukri:login` first).
// Runs a real browser locally under your account; keeps everything in the same DB.
const naukriSchema = z.object({
  query: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

jobsRouter.post(
  '/scrape/naukri',
  asyncHandler(async (req, res) => {
    const { query, limit } = naukriSchema.parse(req.body ?? {});
    const q = query ?? env.JOB_FINDER_QUERY;
    const jobs = await scrapeNaukri({ query: q, limit: limit ?? 25 });
    const { fetched, created, updated } = await ingestRawJobs(jobs);
    res.json({ source: 'naukri', query: q, fetched, created, updated });
  }),
);

const createJobSchema = z.object({
  title: z.string().min(1),
  descriptionRaw: z.string().min(1),
  url: z.string().url().optional(),
  location: z.string().optional(),
  salaryText: z.string().optional(),
  source: z
    .enum(['LINKEDIN', 'NAUKRI', 'INDEED', 'INSTAHYRE', 'WELLFOUND', 'COMPANY_CAREERS', 'OTHER'])
    .default('OTHER'),
  externalId: z.string().optional(),
  companyName: z.string().optional(),
});

// Create a job (manual entry now; the Job Finder module will feed this later).
jobsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = createJobSchema.parse(req.body);
    const { companyName, ...rest } = body;

    const company = companyName
      ? await prisma.company.upsert({
          where: { name: companyName },
          create: { name: companyName },
          update: {},
        })
      : null;

    const job = await prisma.job.create({
      data: { ...rest, companyId: company?.id ?? null },
    });
    res.status(201).json(job);
  }),
);

// List jobs (most recent first).
jobsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const jobs = await prisma.job.findMany({
      orderBy: { scrapedAt: 'desc' },
      take: 100,
      include: { analysis: true, company: true },
    });
    res.json(jobs);
  }),
);

jobsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { analysis: true, company: true, atsScores: true },
    });
    if (!job) throw new NotFoundError('Job');
    res.json(job);
  }),
);

// Run the AI Job Analyzer against this job.
jobsRouter.post(
  '/:id/analyze',
  asyncHandler(async (req, res) => {
    const analysis = await analyzeJob(String(req.params.id));
    res.json(analysis);
  }),
);
