import { db } from '@/lib/db';
import { users, socialLinks, follows } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq, ilike, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() || '';

  let userMatches;
  if (q.length >= 2) {
    const pattern = `%${q}%`;
    userMatches = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName })
      .from(users)
      .where(or(ilike(users.username, pattern), ilike(users.displayName, pattern)))
      .limit(20);
  } else {
    // No query — return first 10 users
    userMatches = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName })
      .from(users)
      .limit(10);
  }

  const socialMatches = q.length >= 2
    ? await db
        .select({ userId: socialLinks.userId, platform: socialLinks.platform })
        .from(socialLinks)
        .where(ilike(socialLinks.username, `%${q}%`))
        .limit(20)
    : [];

  const resultMap = new Map<string, {
    id: string;
    username: string | null;
    displayName: string;
    matchedPlatforms: string[];
  }>();

  for (const u of userMatches) {
    const existing = resultMap.get(u.id) || {
      id: u.id, username: u.username, displayName: u.displayName, matchedPlatforms: [],
    };
    if (u.username && u.username.toLowerCase().includes(q.toLowerCase())) {
      existing.matchedPlatforms.push('username');
    }
    resultMap.set(u.id, existing);
  }

  const socialUserIds = [...new Set(socialMatches.map((s) => s.userId))];
  const missingUserIds = socialUserIds.filter((id) => !resultMap.has(id));
  if (missingUserIds.length > 0) {
    for (const uid of missingUserIds) {
      const [u] = await db
        .select({ id: users.id, username: users.username, displayName: users.displayName })
        .from(users)
        .where(eq(users.id, uid))
        .limit(1);
      if (u) {
        resultMap.set(u.id, { id: u.id, username: u.username, displayName: u.displayName, matchedPlatforms: [] });
      }
    }
  }

  for (const s of socialMatches) {
    const existing = resultMap.get(s.userId);
    if (existing && !existing.matchedPlatforms.includes(s.platform)) {
      existing.matchedPlatforms.push(s.platform);
    }
  }

  const userFollows = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, user.id));
  const followingSet = new Set(userFollows.map((f) => f.followingId));

  const results = [...resultMap.values()]
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      username: r.username,
      displayName: r.displayName,
      matchedPlatforms: r.matchedPlatforms,
      isFollowing: followingSet.has(r.id),
    }));

  return NextResponse.json(results);
}
