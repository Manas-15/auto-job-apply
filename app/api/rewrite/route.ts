import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { BadRequestError, NotFoundError, toResponse } from '@/lib/errors';
import { rewriteResume } from '@/lib/rewrite';
import { computeAtsScore } from '@/lib/ats';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({ analysisId: z.string().min(1) });

/**
 * AI Resume Rewriter (Module 9): tailor the résumé for the analyzed job,
 * honestly (no fabricated skills). Recomputes the ATS score on the rewrite
 * so the UI can show a before/after lift, and stores it on the Analysis.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { analysisId } = schema.parse(await req.json());

    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, userId: user.id },
    });
    if (!analysis) throw new NotFoundError('Analysis');
    if (!analysis.resumeText) throw new BadRequestError('Analysis has no résumé text to rewrite');

    const { data, model } = await rewriteResume(analysis.resumeText, {
      title: analysis.jobTitle ?? '',
      requiredSkills: analysis.requiredSkills,
      niceToHaveSkills: analysis.niceToHaveSkills,
      atsKeywords: analysis.atsKeywords,
    });

    const rewritten = data.rewrittenResume?.trim();
    if (!rewritten) throw new BadRequestError('Rewriter returned an empty résumé');

    const after = computeAtsScore(rewritten, {
      required: analysis.requiredSkills,
      niceToHave: analysis.niceToHaveSkills,
      ats: analysis.atsKeywords,
    });

    const updated = await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        rewrittenText: rewritten,
        changesSummary: data.changesSummary ?? [],
        addedKeywords: data.addedKeywords ?? [],
        gaps: (data.gaps ?? []) as unknown as Prisma.InputJsonValue,
        atsScoreAfter: after.score,
        model,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return toResponse(err);
  }
}
