import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { setAuthCookie, verifyPassword } from '@/lib/auth';
import { UnauthorizedError, toResponse } from '@/lib/errors';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const { email, password } = schema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedError('Invalid email or password');
    }

    await setAuthCookie(user.id);
    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    return toResponse(err);
  }
}
