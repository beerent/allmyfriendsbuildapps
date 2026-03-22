import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const check = url.searchParams.get('check');

  if (check) {
    if (!USERNAME_REGEX.test(check)) {
      return NextResponse.json({ available: false, reason: 'Must be 3-20 characters, lowercase letters, numbers, and underscores only' });
    }
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, check));
    return NextResponse.json({ available: existing.length === 0 });
  }

  const user = await verifyAuthToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({ username: user.username, plan: 'pro' });
}

export async function PUT(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { username } = await request.json();

  if (!username || !USERNAME_REGEX.test(username)) {
    return NextResponse.json({ error: 'Must be 3-20 characters, lowercase letters, numbers, and underscores only' }, { status: 400 });
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
  if (existing.length > 0 && existing[0].id !== user.id) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  await db.update(users).set({ username }).where(eq(users.id, user.id));

  return NextResponse.json({ username });
}
