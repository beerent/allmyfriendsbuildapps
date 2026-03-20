// src/app/api/overlay/[profileId]/route.ts
import { db } from '@/lib/db';
import { adProfileItems, adProfiles, marketplaceItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;

  // Get profile to find ownerId
  const profile = await db
    .select({ ownerId: adProfiles.ownerId })
    .from(adProfiles)
    .where(eq(adProfiles.id, profileId))
    .limit(1);

  const ownerId = profile.length > 0 ? profile[0].ownerId : null;

  const items = await db
    .select({
      profileItem: adProfileItems,
      marketplaceItem: marketplaceItems,
    })
    .from(adProfileItems)
    .innerJoin(marketplaceItems, eq(adProfileItems.itemId, marketplaceItems.id))
    .where(eq(adProfileItems.profileId, profileId))
    .orderBy(adProfileItems.sortOrder);

  const result = items.map((i) => ({
    ...i.marketplaceItem,
    displayDuration: i.profileItem.displayDuration ?? i.marketplaceItem.displayDuration,
    sortOrder: i.profileItem.sortOrder,
  }));

  return NextResponse.json({ ownerId, items: result });
}
