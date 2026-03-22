import { db } from '@/lib/db';
import { adProfiles, adProfileItems, marketplaceItems, notifications } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { getPlanLimits } from '@/lib/plans';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const profile = await db
    .select()
    .from(adProfiles)
    .where(and(eq(adProfiles.id, id), eq(adProfiles.ownerId, user.id)))
    .limit(1);

  if (profile.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const items = await db
    .select({
      profileItem: adProfileItems,
      marketplaceItem: marketplaceItems,
    })
    .from(adProfileItems)
    .innerJoin(marketplaceItems, eq(adProfileItems.itemId, marketplaceItems.id))
    .where(eq(adProfileItems.profileId, id))
    .orderBy(adProfileItems.sortOrder);

  return NextResponse.json({
    ...profile[0],
    items: items.map((i) => ({
      ...i.profileItem,
      marketplaceItem: i.marketplaceItem,
    })),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const profile = await db
    .select()
    .from(adProfiles)
    .where(and(eq(adProfiles.id, id), eq(adProfiles.ownerId, user.id)))
    .limit(1);

  if (profile.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { name, items } = await request.json();

  if (name) {
    await db
      .update(adProfiles)
      .set({ name, updatedAt: new Date() })
      .where(eq(adProfiles.id, id));
  }

  if (items) {
    await db.delete(adProfileItems).where(eq(adProfileItems.profileId, id));

    if (items.length > 0) {
      await db.insert(adProfileItems).values(
        items.map((item: { itemId: string; displayDuration?: number; config?: unknown }, index: number) => ({
          profileId: id,
          itemId: item.itemId,
          displayDuration: item.displayDuration ?? 10,
          sortOrder: index,
          config: item.config ?? null,
        }))
      );

      for (const newItem of items) {
        const [mi] = await db.select({ creatorId: marketplaceItems.creatorId }).from(marketplaceItems).where(eq(marketplaceItems.id, newItem.itemId)).limit(1);
        if (mi?.creatorId && mi.creatorId !== user.id) {
          await db.insert(notifications).values({
            userId: mi.creatorId,
            type: 'card_added',
            actorId: user.id,
            targetId: newItem.itemId,
          });
        }
      }
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const deleted = await db
    .delete(adProfiles)
    .where(and(eq(adProfiles.id, id), eq(adProfiles.ownerId, user.id)))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
