import { db } from '@/lib/db';
import { users, marketplaceItems, socialLinks, follows } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq, count, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      plan: users.plan,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const userSocialLinks = await db
    .select({
      platform: socialLinks.platform,
      username: socialLinks.username,
      isPrimary: socialLinks.isPrimary,
    })
    .from(socialLinks)
    .where(eq(socialLinks.userId, user.id));

  const primaryLink = userSocialLinks.find((l) => l.isPrimary);

  const items = await db
    .select()
    .from(marketplaceItems)
    .where(eq(marketplaceItems.creatorId, user.id))
    .orderBy(marketplaceItems.createdAt);

  const [followerResult] = await db
    .select({ count: count() })
    .from(follows)
    .where(eq(follows.followingId, user.id));

  const [followingResult] = await db
    .select({ count: count() })
    .from(follows)
    .where(eq(follows.followerId, user.id));

  let isFollowing = false;
  const viewer = await verifyAuthToken(request);
  if (viewer && viewer.id !== user.id) {
    const [followRow] = await db
      .select({ id: follows.id })
      .from(follows)
      .where(and(eq(follows.followerId, viewer.id), eq(follows.followingId, user.id)))
      .limit(1);
    isFollowing = !!followRow;
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      socialLinks: userSocialLinks.map((l) => ({
        platform: l.platform,
        username: l.username,
      })),
      primaryIdentity: primaryLink ? primaryLink.platform : (user.username ? 'username' : null),
      followerCount: Number(followerResult.count),
      followingCount: Number(followingResult.count),
      isFollowing,
      isSelf: viewer?.id === user.id,
      plan: 'pro',
    },
    items,
  });
}
