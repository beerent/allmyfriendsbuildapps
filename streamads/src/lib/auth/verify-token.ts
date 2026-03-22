import { getAdminAuth } from '@/lib/firebase/admin';
import { db } from '@/lib/db';
import { users, adProfiles } from '@/lib/db/schema';
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
      // Generate a default username from email or UID
      const emailPrefix = (decoded.email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
      let defaultUsername = emailPrefix || `user_${decoded.uid.slice(0, 8)}`;

      // Ensure uniqueness by checking and appending random suffix if needed
      const taken = await db.select({ id: users.id }).from(users).where(eq(users.username, defaultUsername)).limit(1);
      if (taken.length > 0) {
        defaultUsername = `${defaultUsername}_${Math.random().toString(36).slice(2, 6)}`;
      }

      const [newUser] = await db
        .insert(users)
        .values({
          firebaseUid: decoded.uid,
          displayName: decoded.name || decoded.email || 'Anonymous',
          email: decoded.email || '',
          username: defaultUsername,
        })
        .returning();

      // Create a default profile for new users
      await db.insert(adProfiles).values({
        ownerId: newUser.id,
        name: 'My Overlay',
      });

      return newUser;
    }

    return existing[0];
  } catch {
    return null;
  }
}
