import { db } from '@/lib/db';
import { adProfileItems, marketplaceItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;

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

  return NextResponse.json(result);
}
