import { db } from '@/lib/db';
import { marketplaceItems, users, adProfileItems, upvotes, socialLinks, follows } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq, ilike, or, and, count, desc, isNull, inArray, type SQL } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search');
  const type = url.searchParams.get('type');
  const feed = url.searchParams.get('feed');

  // Get current user for upvote status (optional, works without auth)
  const user = await verifyAuthToken(request);

  const conditions: SQL[] = [];

  // Exclude archived items
  conditions.push(eq(marketplaceItems.archived, 0));

  // Feed filter
  if (feed === 'official') {
    conditions.push(isNull(marketplaceItems.creatorId));
  } else if (feed === 'following' && user) {
    const followedUsers = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, user.id));
    const followedIds = followedUsers.map((f) => f.followingId);
    if (followedIds.length > 0) {
      conditions.push(inArray(marketplaceItems.creatorId, followedIds));
    } else {
      return NextResponse.json([]);
    }
  }

  if (search) {
    conditions.push(
      or(
        ilike(marketplaceItems.headline, `%${search}%`),
        ilike(marketplaceItems.subtext, `%${search}%`),
        ilike(users.displayName, `%${search}%`),
        ilike(marketplaceItems.tags, `%${search}%`)
      )!
    );
  }

  if (type === 'tools') {
    conditions.push(
      or(
        eq(marketplaceItems.type, 'spotify'),
        eq(marketplaceItems.type, 'placeholder'),
        eq(marketplaceItems.type, 'twitch')
      )!
    );
  } else if (type && ['ad', 'card', 'spotify', 'placeholder', 'twitch'].includes(type)) {
    conditions.push(eq(marketplaceItems.type, type as any));
  }

  const category = url.searchParams.get('category');
  if (category) {
    conditions.push(eq(marketplaceItems.category, category));
  }

  const upvoteCount = count(upvotes.id);

  let query = db
    .select({
      item: marketplaceItems,
      creatorName: users.displayName,
      creatorFirebaseUid: users.firebaseUid,
      creatorPlan: users.plan,
      usageCount: count(adProfileItems.id),
      upvoteCount,
    })
    .from(marketplaceItems)
    .leftJoin(users, eq(marketplaceItems.creatorId, users.id))
    .leftJoin(adProfileItems, eq(marketplaceItems.id, adProfileItems.itemId))
    .leftJoin(upvotes, eq(marketplaceItems.id, upvotes.itemId))
    .groupBy(marketplaceItems.id, users.displayName, users.firebaseUid, users.plan)
    .orderBy(desc(upvoteCount), marketplaceItems.createdAt)
    .$dynamic();

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const results = await query;

  // Get user's upvoted item IDs
  let userUpvotedIds: Set<string> = new Set();
  if (user) {
    const userUpvotes = await db
      .select({ itemId: upvotes.itemId })
      .from(upvotes)
      .where(eq(upvotes.userId, user.id));
    userUpvotedIds = new Set(userUpvotes.map((u) => u.itemId));
  }

  // Get primary social links for all creators
  const creatorIds = [...new Set(results.map((r) => r.item.creatorId).filter(Boolean))] as string[];
  const primaryLinks = creatorIds.length > 0
    ? await db.select().from(socialLinks).where(eq(socialLinks.isPrimary, 1))
    : [];
  const creatorSocialMap = new Map(primaryLinks.map((l) => [l.userId, { platform: l.platform, username: l.username }]));

  return NextResponse.json(
    results.map((r) => ({
      ...r.item,
      creatorName: r.creatorName,
      creatorFirebaseUid: r.creatorFirebaseUid,
      usageCount: Number(r.usageCount),
      upvoteCount: Number(r.upvoteCount),
      upvoted: userUpvotedIds.has(r.item.id),
      creatorPlan: 'pro',
      creatorSocial: r.item.creatorId ? creatorSocialMap.get(r.item.creatorId) ?? null : null,
    }))
  );
}

export async function POST(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { headline, subtext, brandUrl, imageUrl, colorTheme, colorStyle, subtext2, tags, category } = body;
  const type = body.type || 'ad';

  if (type === 'card' && brandUrl) {
    return NextResponse.json({ error: 'Cards cannot have a brand URL' }, { status: 400 });
  }
  if (type === 'ad' && subtext2) {
    return NextResponse.json({ error: 'Ads cannot have a second subtext' }, { status: 400 });
  }

  const [item] = await db
    .insert(marketplaceItems)
    .values({
      type,
      creatorId: user.id,
      headline,
      subtext,
      brandUrl: type === 'card' ? null : brandUrl,
      imageUrl,
      subtext2: type === 'ad' ? null : subtext2,
      colorTheme: colorTheme || 'blue',
      colorStyle: colorStyle || 'matched',
      tags: Array.isArray(tags) ? tags.slice(0, 10).map((t: string) => t.trim().toLowerCase()).filter(Boolean).join(',') : null,
      category: type === 'ad' ? (category || null) : null,
    })
    .returning();

  return NextResponse.json(item, { status: 201 });
}
