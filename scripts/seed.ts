/**
 * Truncates the dev database and seeds a sign-in-able account plus a little
 * demo data. Usage: `bun db:seed`.
 */
import { hashPassword } from 'better-auth/crypto';
import { reset } from 'drizzle-seed';
import * as schema from '#/db/schema.ts';
import { db } from '#/server/db.server.ts';

await reset(db, schema);

const [user] = await db
  .insert(schema.users)
  .values({ email: 'test@example.com', name: 'Test User', emailVerified: true })
  .returning();

await db.insert(schema.accounts).values({
  userId: user.id,
  accountId: user.id,
  providerId: 'credential',
  password: await hashPassword('password123'),
});

await db.insert(schema.bookmarks).values([
  { userId: user.id, surah: 2, verse: 255 },
  { userId: user.id, surah: 18, verse: 10 },
]);

await db.insert(schema.notes).values({
  userId: user.id,
  surah: 1,
  verse: 5,
  body: 'You alone we worship, and You alone we ask for help.',
});

console.log('Seeded: user=test@example.com pass=password123 bookmarks=2 notes=1');

await db.$client.end();
