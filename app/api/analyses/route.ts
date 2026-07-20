import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { toResponse } from '@/lib/errors';

export const runtime = 'nodejs';

// Analysis History (Module 13): the user's past runs, most recent first.
export async function GET() {
  try {
    const user = await requireUser();
    const analyses = await prisma.analysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        jobTitle: true,
        jdSummary: true,
        atsScore: true,
        atsScoreAfter: true,
        rewrittenText: true,
        createdAt: true,
      },
    });
    return NextResponse.json(analyses);
  } catch (err) {
    return toResponse(err);
  }
}
