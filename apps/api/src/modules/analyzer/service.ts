import { generateJson } from '../../ai/index.js';
import { NotFoundError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { buildAnalyzePrompt, type JdExtraction } from './prompts.js';

/**
 * Run the AI Job Analyzer (Module 2) against a stored job and persist
 * the structured extraction. Idempotent: re-running overwrites the
 * existing analysis for the job.
 */
export async function analyzeJob(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new NotFoundError('Job');
  if (!job.descriptionRaw) throw new NotFoundError('Job description');

  const { data, model } = await generateJson<JdExtraction>(
    buildAnalyzePrompt(job.title, job.descriptionRaw),
    { temperature: 0.2 },
  );

  const payload = {
    requiredSkills: normalize(data.requiredSkills),
    niceToHaveSkills: normalize(data.niceToHaveSkills),
    atsKeywords: normalize(data.atsKeywords),
    responsibilities: (data.responsibilities ?? []).filter(Boolean),
    minYears: data.minYears ?? null,
    maxYears: data.maxYears ?? null,
    seniority: data.seniority ?? null,
    extractedLocation: data.extractedLocation ?? null,
    extractedSalary: data.extractedSalary ?? null,
    summary: data.summary ?? null,
    model,
  };

  return prisma.jobAnalysis.upsert({
    where: { jobId },
    create: { jobId, ...payload },
    update: payload,
  });
}

/** Lowercase, trim, and dedupe a keyword list. */
function normalize(list: string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list ?? []) {
    const s = String(raw).trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}
