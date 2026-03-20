import { getAdminAuth } from '@/lib/firebase/admin';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { buildAuthUrl } from '@/lib/twitch/oauth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  }

  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(token);

    const user = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, decoded.uid))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const authUrl = buildAuthUrl(user[0].id);
    return NextResponse.redirect(authUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
