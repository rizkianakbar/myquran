import { and, desc, eq, sql } from 'drizzle-orm';
import { notes } from '#api/databases/schema.ts';
import type { AppContext } from '#api/primitives/app-context.ts';

/**
 * A verse reference, e.g. `{ surah: 2, verse: 255 }`.
 */
export interface VerseRef {
  surah: number;
  verse: number;
}

/**
 * List a user's notes, most recently edited first.
 */
export async function listNotes(ctx: AppContext, userId: string) {
  return ctx.container.db.select().from(notes).where(eq(notes.userId, userId)).orderBy(desc(notes.updatedAt));
}

/**
 * List a user's notes within one surah, in verse order.
 */
export async function listNotesForSurah(ctx: AppContext, userId: string, surah: number) {
  return ctx.container.db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.surah, surah)))
    .orderBy(notes.verse);
}

/**
 * Create or replace the user's note on a verse.
 */
export async function saveNote(ctx: AppContext, userId: string, input: VerseRef & { body: string }) {
  const [note] = await ctx.container.db
    .insert(notes)
    .values({ userId, surah: input.surah, verse: input.verse, body: input.body })
    .onConflictDoUpdate({
      target: [notes.userId, notes.surah, notes.verse],
      set: { body: input.body, updatedAt: sql`now()` },
    })
    .returning();

  return note;
}

/**
 * Delete the user's note on a verse. Returns the deleted note, or null if
 * there was none.
 */
export async function deleteNote(ctx: AppContext, userId: string, ref: VerseRef) {
  const [note] = await ctx.container.db
    .delete(notes)
    .where(and(eq(notes.userId, userId), eq(notes.surah, ref.surah), eq(notes.verse, ref.verse)))
    .returning();

  return note ?? null;
}
