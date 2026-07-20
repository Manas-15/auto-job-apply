import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { NotFoundError, toResponse } from '@/lib/errors';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const analysis = await prisma.analysis.findFirst({ where: { id, userId: user.id } });
    if (!analysis) throw new NotFoundError('Analysis');
    return NextResponse.json(analysis);
  } catch (err) {
    return toResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const found = await prisma.analysis.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!found) throw new NotFoundError('Analysis');
    await prisma.analysis.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toResponse(err);
  }
}
