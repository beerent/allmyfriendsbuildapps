import { db } from '@/lib/db';
import { socialLinks } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const links = await db
    .select()
    .from(socialLinks)
    .where(eq(socialLinks.userId, user.id));

  return NextResponse.json(links);
}

export async function PUT(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { links, primaryPlatform } = await request.json() as {
    links: { platform: string; username: string }[];
    primaryPlatform: string | null;
  };

  // Delete all existing links for this user
  await db.delete(socialLinks).where(eq(socialLinks.userId, user.id));

  // Insert new links
  const toInsert = links
    .filter((l) => l.username.trim())
    .map((l) => ({
      userId: user.id,
      platform: l.platform as 'twitch' | 'youtube' | 'kick' | 'x',
      username: l.username.trim(),
      isPrimary: l.platform === primaryPlatform ? 1 : 0,
    }));

  if (toInsert.length > 0) {
    await db.insert(socialLinks).values(toInsert);
  }

  return NextResponse.json({ success: true });
}
