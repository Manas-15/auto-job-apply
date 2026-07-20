import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { NotFoundError, toResponse } from '@/lib/errors';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

async function ownedResume(userId: string, id: string) {
  const resume = await prisma.resume.findFirst({ where: { id, userId } });
  if (!resume) throw new NotFoundError('Résumé');
  return resume;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json(await ownedResume(user.id, id));
  } catch (err) {
    return toResponse(err);
  }
}

const updateSchema = z.object({
  label: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1).optional(),
});

export async function PUT(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await ownedResume(user.id, id);
    const data = updateSchema.parse(await req.json());
    const updated = await prisma.resume.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    return toResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await ownedResume(user.id, id);
    await prisma.resume.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toResponse(err);
  }
}
