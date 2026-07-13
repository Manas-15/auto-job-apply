import { BadRequestError, NotFoundError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

export interface AtsResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  notes: string;
}

/**
 * ATS score (Module 4): how well a resume covers the keywords an ATS
 * would scan the JD for. Deterministic keyword matching — no AI cost.
 * Required skills are weighted more heavily than nice-to-haves.
 */
export function computeAtsScore(resumeText: string, keywords: {
  required: string[];
  niceToHave: string[];
  ats: string[];
}): AtsResult {
  const haystack = resumeText.toLowerCase();

  // Weight buckets: required skills matter most, then ATS keywords, then nice-to-have.
  const buckets: { list: string[]; weight: number }[] = [
    { list: keywords.required, weight: 3 },
    { list: keywords.ats, weight: 1.5 },
    { list: keywords.niceToHave, weight: 1 },
  ];

  const matched = new Set<string>();
  const missing = new Set<string>();
  let earned = 0;
  let possible = 0;

  for (const { list, weight } of buckets) {
    for (const kw of dedupe(list)) {
      possible += weight;
      if (containsKeyword(haystack, kw)) {
        earned += weight;
        matched.add(kw);
      } else {
        missing.add(kw);
      }
    }
  }

  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);

  return {
    score,
    matchedKeywords: [...matched],
    // A keyword can appear in multiple buckets; only report as missing if never matched.
    missingKeywords: [...missing].filter((k) => !matched.has(k)),
    notes:
      possible === 0
        ? 'No keywords available — analyze the job first.'
        : `Matched ${matched.size} of ${matched.size + missing.size} distinct keywords.`,
  };
}

/** Score a stored resume against a stored job's analysis and persist it. */
export async function scoreResumeAgainstJob(resumeId: string, jobId: string) {
  const [resume, analysis] = await Promise.all([
    prisma.resume.findUnique({ where: { id: resumeId } }),
    prisma.jobAnalysis.findUnique({ where: { jobId } }),
  ]);

  if (!resume) throw new NotFoundError('Resume');
  if (!analysis) throw new BadRequestError('Job has not been analyzed yet');
  if (!resume.rawText) throw new BadRequestError('Resume has no extracted text to score');

  const result = computeAtsScore(resume.rawText, {
    required: analysis.requiredSkills,
    niceToHave: analysis.niceToHaveSkills,
    ats: analysis.atsKeywords,
  });

  return prisma.atsScore.create({
    data: {
      resumeId,
      jobId,
      score: result.score,
      matchedKeywords: result.matchedKeywords,
      missingKeywords: result.missingKeywords,
      notes: result.notes,
    },
  });
}

/** Whole-word-ish match that tolerates punctuation (e.g. "Node.js", "CI/CD"). */
function containsKeyword(haystack: string, keyword: string): boolean {
  const kw = keyword.toLowerCase().trim();
  if (!kw) return false;
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Boundaries that aren't part of an identifier, so "react" doesn't match "reactor".
  const re = new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, 'i');
  return re.test(haystack);
}

function dedupe(list: string[]): string[] {
  return [...new Set(list.map((s) => s.trim()).filter(Boolean))];
}
