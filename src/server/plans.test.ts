import { describe, expect } from 'vitest';
import { addVerse, decodeVerseSet, emptyVerseSet, encodeVerseSet, hasVerse } from '#/lib/quran/verse-set.ts';
import { createTestUser, serverTest } from '#/test/database.ts';
import { deletePlan, getPlan, savePlan } from './plans.server.ts';
import type { ReadingPlan } from './schemas.ts';

function plan(overrides: Partial<ReadingPlan> = {}, verses: number[] = []): ReadingPlan {
  const set = emptyVerseSet();
  for (const index of verses) addVerse(set, index);
  return {
    id: crypto.randomUUID(),
    startDate: '2026-10-01',
    endDate: '2026-10-30',
    read: encodeVerseSet(set),
    today: { date: '2026-10-01', fromPage: 1, toPage: 21 },
    completedAt: null,
    createdAt: '2026-10-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('savePlan', () => {
  serverTest('stores a plan and reads it back as the client sent it', async ({ db }) => {
    const user = await createTestUser(db);
    const sent = plan({}, [0, 1, 2]);

    await savePlan(db, user.id, sent);

    expect(await getPlan(db, user.id)).toEqual(sent);
  });

  serverTest('unions the reading of two copies of the same plan', async ({ db }) => {
    const user = await createTestUser(db);
    const phone = plan({}, [0, 1]);
    const laptop = { ...phone, endDate: '2026-11-29', read: plan({}, [500]).read };

    await savePlan(db, user.id, phone);
    const saved = await savePlan(db, user.id, laptop);

    const read = decodeVerseSet(saved.read);
    expect([0, 1, 500].every((i) => hasVerse(read, i))).toBe(true);
    expect(saved.endDate).toBe('2026-11-29');
  });

  serverTest('replaces an older plan with a newer one, but not the reverse', async ({ db }) => {
    const user = await createTestUser(db);
    const older = plan({ createdAt: '2026-10-01T08:00:00.000Z' });
    const newer = plan({ createdAt: '2026-10-05T08:00:00.000Z' });

    await savePlan(db, user.id, older);
    expect((await savePlan(db, user.id, newer)).id).toBe(newer.id);
    // A stale device pushing the old plan gets the newer one back.
    expect((await savePlan(db, user.id, older)).id).toBe(newer.id);
  });

  serverTest('keeps each user to their own plan', async ({ db }) => {
    const user = await createTestUser(db);
    const other = await createTestUser(db);
    await savePlan(db, user.id, plan());

    expect(await getPlan(db, other.id)).toBeNull();
  });
});

describe('deletePlan', () => {
  serverTest('deletes only the named plan', async ({ db }) => {
    const user = await createTestUser(db);
    const current = plan();
    await savePlan(db, user.id, current);

    expect(await deletePlan(db, user.id, crypto.randomUUID())).toBe(false);
    expect(await deletePlan(db, user.id, current.id)).toBe(true);
    expect(await getPlan(db, user.id)).toBeNull();
  });
});
