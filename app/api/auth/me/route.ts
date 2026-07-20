import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { toResponse } from '@/lib/errors';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user });
  } catch (err) {
    return toResponse(err);
  }
}
