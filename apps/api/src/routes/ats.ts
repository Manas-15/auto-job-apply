import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import { computeAtsScore, scoreResumeAgainstJob } from '../modules/ats/service.js';

export const atsRouter = Router();

// Score a stored resume against a stored (analyzed) job; persists the result.
const scoreSchema = z.object({ resumeId: z.string().min(1), jobId: z.string().min(1) });

atsRouter.post(
  '/score',
  asyncHandler(async (req, res) => {
    const { resumeId, jobId } = scoreSchema.parse(req.body);
    const result = await scoreResumeAgainstJob(resumeId, jobId);
    res.status(201).json(result);
  }),
);

// Ad-hoc scoring: paste resume text + keywords, get a score without storing anything.
const previewSchema = z.object({
  resumeText: z.string().min(1),
  required: z.array(z.string()).default([]),
  niceToHave: z.array(z.string()).default([]),
  ats: z.array(z.string()).default([]),
});

atsRouter.post(
  '/preview',
  asyncHandler(async (req, res) => {
    const { resumeText, required, niceToHave, ats } = previewSchema.parse(req.body);
    res.json(computeAtsScore(resumeText, { required, niceToHave, ats }));
  }),
);
