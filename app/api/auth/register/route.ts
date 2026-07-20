import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, setAuthCookie } from '@/lib/auth';
import { BadRequestError, toResponse } from '@/lib/errors';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().trim().min(1).optional(),
});

export async function POST(req: Request) {
  try {
    const { email, password, name } = schema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw new BadRequestError('An account with this email already exists');

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
        name: name ?? null,
      },
      select: { id: true, email: true, name: true },
    });

    await setAuthCookie(user.id);
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
