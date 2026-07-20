import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { toResponse } from '@/lib/errors';
import { analyzeJobDescription } from '@/lib/analyzer';
import { computeAtsScore } from '@/lib/ats';

export const runtime = 'nodejs';
// AI calls can take a while; give the handler room.
export const maxDuration = 60;

const schema = z.object({
  resumeText: z.string().trim().min(1, 'Résumé text is required'),
  jobText: z.string().trim().min(1, 'Job description is required'),
  jobTitle: z.string().trim().optional(),
  resumeId: z.string().optional(),
});

/**
 * Core flow (Modules 4/5/6): extract ATS keywords from the JD, score the
 * résumé against them, persist an Analysis, and return it. No AI-invented
 * content — this step only measures fit.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { resumeText, jobText, jobTitle, resumeId } = schema.parse(await req.json());

    const { data: jd, model } = await analyzeJobDescription(jobTitle ?? '', jobText);
    const ats = computeAtsScore(resumeText, {
      required: jd.requiredSkills,
      niceToHave: jd.niceToHaveSkills,
      ats: jd.atsKeywords,
    });

    // Only link resumeId if it belongs to this user.
    let linkedResumeId: string | null = null;
    if (resumeId) {
      const owned = await prisma.resume.findFirst({
        where: { id: resumeId, userId: user.id },
        select: { id: true },
      });
      linkedResumeId = owned?.id ?? null;
    }

    const analysis = await prisma.analysis.create({
      data: {
        userId: user.id,
        resumeId: linkedResumeId,
        jobTitle: jobTitle ?? null,
        jobText,
        resumeText,
        requiredSkills: jd.requiredSkills,
        niceToHaveSkills: jd.niceToHaveSkills,
        atsKeywords: jd.atsKeywords,
        jdSummary: jd.summary || null,
        atsScore: ats.score,
        matchedKeywords: ats.matchedKeywords,
        missingKeywords: ats.missingKeywords,
        notes: ats.notes,
        model,
      },
    });

    return NextResponse.json(analysis, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
