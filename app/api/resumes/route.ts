import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { toResponse } from '@/lib/errors';

export const runtime = 'nodejs';

// List the signed-in user's résumés, most recent first.
export async function GET() {
  try {
    const user = await requireUser();
    const resumes = await prisma.resume.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return NextResponse.json(resumes);
  } catch (err) {
    return toResponse(err);
  }
}

const createSchema = z.object({
  label: z.string().trim().min(1).default('My résumé'),
  content: z.string().trim().min(1, 'Résumé text is required'),
});

// Save a new résumé version.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { label, content } = createSchema.parse(await req.json());
    const resume = await prisma.resume.create({
      data: { userId: user.id, label, content },
    });
    return NextResponse.json(resume, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
