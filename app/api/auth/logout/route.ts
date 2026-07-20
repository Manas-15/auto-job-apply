import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';
import { toResponse } from '@/lib/errors';

export const runtime = 'nodejs';

export async function POST() {
  try {
    await clearAuthCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toResponse(err);
  }
}
