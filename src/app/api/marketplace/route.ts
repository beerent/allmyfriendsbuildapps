import { db } from '@/lib/db';
import { marketplaceItems, users, adProfileItems } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq, ilike, or, and, count, type SQL } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search');
  const type = url.searchParams.get('type');

  const conditions: SQL[] = [];

  if (search) {
    conditions.push(
      or(
        ilike(marketplaceItems.headline, `%${search}%`),
        ilike(marketplaceItems.subtext, `%${search}%`),
        ilike(users.displayName, `%${search}%`)
      )!
    );
  }

  if (type && ['ad', 'spotify', 'placeholder'].includes(type)) {
    conditions.push(eq(marketplaceItems.type, type as 'ad' | 'spotify' | 'placeholder'));
  }

  let query = db
    .select({
      item: marketplaceItems,
      creatorName: users.displayName,
      creatorFirebaseUid: users.firebaseUid,
      usageCount: count(adProfileItems.id),
    })
    .from(marketplaceItems)
    .leftJoin(users, eq(marketplaceItems.creatorId, users.id))
    .leftJoin(adProfileItems, eq(marketplaceItems.id, adProfileItems.itemId))
    .groupBy(marketplaceItems.id, users.displayName, users.firebaseUid)
    .orderBy(marketplaceItems.createdAt)
    .$dynamic();

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const results = await query;

  return NextResponse.json(
    results.map((r) => ({
      ...r.item,
      creatorName: r.creatorName,
      creatorFirebaseUid: r.creatorFirebaseUid,
      usageCount: Number(r.usageCount),
    }))
  );
}

export async function POST(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { headline, subtext, brandUrl, imageUrl, displayDuration } = body;

  const [item] = await db
    .insert(marketplaceItems)
    .values({
      type: 'ad',
      creatorId: user.id,
      headline,
      subtext,
      brandUrl,
      imageUrl,
      displayDuration: displayDuration || 10,
    })
    .returning();

  return NextResponse.json(item, { status: 201 });
}
