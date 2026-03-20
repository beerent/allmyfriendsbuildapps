import { getNowPlaying } from '@/lib/spotify/now-playing';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  }

  const result = await getNowPlaying(userId);
  return NextResponse.json(result);
}
