import { db } from '@/lib/db';
import { follows, notifications } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await request.json();
  if (!userId || userId === user.id) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const existing = await db
    .select({ id: follows.id })
    .from(follows)
    .where(and(eq(follows.followerId, user.id), eq(follows.followingId, userId)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(follows).where(eq(follows.id, existing[0].id));
    return NextResponse.json({ following: false });
  }

  await db.insert(follows).values({
    followerId: user.id,
    followingId: userId,
  });

  await db.insert(notifications).values({
    userId: userId,
    type: 'follow',
    actorId: user.id,
  });

  return NextResponse.json({ following: true });
}
