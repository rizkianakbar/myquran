import { randomUUID } from 'node:crypto';
import { afterAll, test } from 'vitest';
import { users } from '#/db/schema.ts';
import { type Database, db } from '#/server/db.server.ts';

class Rollback extends Error {}

afterAll(() => db.$client.end());

/**
 * A Vitest test whose `db` is a transaction on the real database
 * (`DATABASE_URL`), always rolled back afterwards — nothing a test writes is
 * ever committed. Works on any Postgres, Neon branches included.
 *
 * @example
 * ```ts
 * serverTest('saves a note', async ({ db }) => {
 *   const user = await createTestUser(db);
 *   await saveNote(db, user.id, { surah: 1, verse: 1, body: 'x' });
 * });
 * ```
 */
export const serverTest = test.extend<{ db: Database }>({
  async db({}, use) {
    await db
      .transaction(async (tx) => {
        await use(tx);
        throw new Rollback();
      })
      .catch((error) => {
        if (!(error instanceof Rollback)) throw error;
      });
  },
});

/**
 * Insert a user row directly (bypassing Better Auth). Emails are unique per
 * call so tests never collide with seeded or concurrent rows.
 */
export async function createTestUser(db: Database) {
  const [user] = await db
    .insert(users)
    .values({ email: `test-${randomUUID()}@example.com`, name: 'Test User' })
    .returning();
  return user;
}
