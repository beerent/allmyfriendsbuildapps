import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { avatarUrl } = await request.json();

  if (!avatarUrl || typeof avatarUrl !== 'string') {
    return NextResponse.json({ error: 'Invalid avatar' }, { status: 400 });
  }

  await db.update(users).set({ avatarUrl }).where(eq(users.id, user.id));

  return NextResponse.json({ avatarUrl });
}
