import { generateJson } from '../../ai/index.js';
import { BadRequestError, NotFoundError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { computeAtsScore } from '../ats/service.js';
import { buildOptimizePrompt, type OptimizeResult } from './prompts.js';

export interface OptimizeResponse {
  tailoredResumeId: string;
  tailoredText: string;
  changesSummary: string[];
  addedKeywords: string[];
  gaps: { keyword: string; note: string }[];
  atsBefore: number;
  atsAfter: number;
  model: string;
}

/**
 * Resume Optimizer (M3): tailor a master résumé to a specific analyzed job.
 * Produces a new tailored Resume row, scores it, and returns the before/after
 * ATS match so you can see the lift. Honest by construction — the model is
 * told to surface only genuine experience and report gaps, not invent skills.
 */
export async function optimizeResume(
  masterResumeId: string,
  jobId: string,
): Promise<OptimizeResponse> {
  const [master, job, analysis] = await Promise.all([
    prisma.resume.findUnique({ where: { id: masterResumeId } }),
    prisma.job.findUnique({ where: { id: jobId }, include: { company: true } }),
    prisma.jobAnalysis.findUnique({ where: { jobId } }),
  ]);

  if (!master) throw new NotFoundError('Master résumé');
  if (!master.rawText) throw new BadRequestError('Master résumé has no text to tailor');
  if (!job) throw new NotFoundError('Job');
  if (!analysis) throw new BadRequestError('Job has not been analyzed yet — analyze it first');

  const keywords = {
    required: analysis.requiredSkills,
    niceToHave: analysis.niceToHaveSkills,
    ats: analysis.atsKeywords,
  };

  const { data, model } = await generateJson<OptimizeResult>(
    buildOptimizePrompt(master.rawText, {
      title: job.title,
      company: job.company?.name ?? null,
      requiredSkills: analysis.requiredSkills,
      niceToHaveSkills: analysis.niceToHaveSkills,
      atsKeywords: analysis.atsKeywords,
      responsibilities: analysis.responsibilities,
    }),
    { temperature: 0.3, maxTokens: 3000 },
  );

  const tailoredText = data.tailoredResume?.trim();
  if (!tailoredText) throw new BadRequestError('Optimizer returned an empty résumé');

  // Before/after ATS against the same job keywords.
  const before = computeAtsScore(master.rawText, keywords);
  const after = computeAtsScore(tailoredText, keywords);

  // Persist the tailored résumé + its score.
  const tailored = await prisma.resume.create({
    data: {
      userId: master.userId,
      label: `Tailored — ${job.title}`.slice(0, 120),
      isMaster: false,
      rawText: tailoredText,
      tailoredForJobId: jobId,
      content: {
        changesSummary: data.changesSummary ?? [],
        addedKeywords: data.addedKeywords ?? [],
        gaps: data.gaps ?? [],
        model,
      },
    },
  });

  await prisma.atsScore.create({
    data: {
      resumeId: tailored.id,
      jobId,
      score: after.score,
      matchedKeywords: after.matchedKeywords,
      missingKeywords: after.missingKeywords,
      notes: `Tailored résumé (was ${before.score}%).`,
    },
  });

  return {
    tailoredResumeId: tailored.id,
    tailoredText,
    changesSummary: data.changesSummary ?? [],
    addedKeywords: data.addedKeywords ?? [],
    gaps: data.gaps ?? [],
    atsBefore: before.score,
    atsAfter: after.score,
    model,
  };
}
