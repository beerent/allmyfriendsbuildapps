import { getAdminAuth } from '@/lib/firebase/admin';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function verifyAuthToken(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, decoded.uid))
      .limit(1);

    if (existing.length === 0) {
      const [newUser] = await db
        .insert(users)
        .values({
          firebaseUid: decoded.uid,
          displayName: decoded.name || decoded.email || 'Anonymous',
          email: decoded.email || '',
        })
        .returning();
      return newUser;
    }

    return existing[0];
  } catch {
    return null;
  }
}
