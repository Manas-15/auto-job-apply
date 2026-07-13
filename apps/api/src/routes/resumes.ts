import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { optimizeResume } from '../modules/optimizer/service.js';

export const resumesRouter = Router();

// List résumés (master + tailored), most recent first.
resumesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const resumes = await prisma.resume.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { tailoredForJob: { select: { id: true, title: true } } },
    });
    res.json(resumes);
  }),
);

resumesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const resume = await prisma.resume.findUnique({ where: { id: req.params.id } });
    if (!resume) throw new NotFoundError('Résumé');
    res.json(resume);
  }),
);

// Create or update a master résumé (paste text). If a master already exists
// for the user it is updated in place, so there's a single source of truth.
const upsertSchema = z.object({
  label: z.string().min(1).default('Master'),
  rawText: z.string().min(1),
  userId: z.string().optional(),
});

resumesRouter.post(
  '/master',
  asyncHandler(async (req, res) => {
    const { label, rawText, userId } = upsertSchema.parse(req.body);

    // Default to the seeded demo user when no auth/user is supplied.
    const user =
      (userId
        ? await prisma.user.findUnique({ where: { id: userId } })
        : await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })) ??
      (await prisma.user.create({ data: { email: 'you@auto-job-apply.local', name: 'You' } }));

    const existing = await prisma.resume.findFirst({
      where: { userId: user.id, isMaster: true },
    });

    const resume = existing
      ? await prisma.resume.update({ where: { id: existing.id }, data: { label, rawText } })
      : await prisma.resume.create({
          data: { userId: user.id, label, rawText, isMaster: true },
        });

    res.status(existing ? 200 : 201).json(resume);
  }),
);

// Tailor a master résumé to an analyzed job (M3).
const optimizeSchema = z.object({ resumeId: z.string().min(1), jobId: z.string().min(1) });

resumesRouter.post(
  '/optimize',
  asyncHandler(async (req, res) => {
    const { resumeId, jobId } = optimizeSchema.parse(req.body);
    const result = await optimizeResume(resumeId, jobId);
    res.status(201).json(result);
  }),
);
