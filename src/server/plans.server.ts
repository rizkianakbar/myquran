import { and, eq } from 'drizzle-orm';
import { readingPlans } from '#/db/schema.ts';
import { decodeVerseSet, encodeVerseSet, unionVerseSets } from '#/lib/quran/verse-set.ts';
import type { Database } from './db.server.ts';
import type { ReadingPlan } from './schemas.ts';

type Row = typeof readingPlans.$inferSelect;

function toPlan(row: Row): ReadingPlan {
  return {
    id: row.planId,
    startDate: row.startDate,
    endDate: row.endDate,
    read: row.read,
    today: row.today ?? null,
    // Postgres hands back its own timestamp format; the client speaks ISO.
    completedAt: row.completedAt && new Date(row.completedAt).toISOString(),
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

/**
 * The user's reading plan, or null if they have none.
 */
export async function getPlan(db: Database, userId: string) {
  const [row] = await db.select().from(readingPlans).where(eq(readingPlans.userId, userId));
  return row ? toPlan(row) : null;
}

/**
 * Store a device's copy of the user's plan and return the account's copy,
 * which the device adopts:
 * - the same plan: reading is unioned (neither device loses verses), the
 *   rest comes from the device, the latest edit;
 * - a different plan: the one started later wins, so a plan started on one
 *   device replaces an older one everywhere, and a stale device can't bring
 *   an old plan back.
 */
export async function savePlan(db: Database, userId: string, plan: ReadingPlan) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(readingPlans).where(eq(readingPlans.userId, userId)).for('update');

    if (existing && existing.planId !== plan.id && new Date(existing.createdAt) > new Date(plan.createdAt)) {
      return toPlan(existing);
    }

    const sameEarlierPlan = existing?.planId === plan.id;
    const values = {
      planId: plan.id,
      startDate: plan.startDate,
      endDate: plan.endDate,
      read: sameEarlierPlan
        ? encodeVerseSet(unionVerseSets(decodeVerseSet(existing.read), decodeVerseSet(plan.read)))
        : plan.read,
      today: plan.today,
      completedAt: (sameEarlierPlan && existing.completedAt) || plan.completedAt,
      createdAt: plan.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const [row] = await tx
      .insert(readingPlans)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: readingPlans.userId, set: values })
      .returning();

    return toPlan(row);
  });
}

/**
 * End the user's plan. Only that plan: a newer one started elsewhere is kept.
 * Returns whether a plan was deleted.
 */
export async function deletePlan(db: Database, userId: string, planId: string) {
  const deleted = await db
    .delete(readingPlans)
    .where(and(eq(readingPlans.userId, userId), eq(readingPlans.planId, planId)))
    .returning({ id: readingPlans.id });

  return deleted.length > 0;
}
