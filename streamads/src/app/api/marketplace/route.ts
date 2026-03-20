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
  const { headline, subtext, brandUrl, imageUrl, colorTheme, colorStyle, subtext2 } = body;
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
    })
    .returning();

  return NextResponse.json(item, { status: 201 });
}
