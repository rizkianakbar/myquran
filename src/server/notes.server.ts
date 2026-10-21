import { and, desc, eq, sql } from 'drizzle-orm';
import { notes } from '#/db/schema.ts';
import type { VerseRef } from '#/server/schemas.ts';
import type { Database } from './db.server.ts';

/**
 * List a user's notes, most recently edited first.
 */
export async function listNotes(db: Database, userId: string) {
  return db.select().from(notes).where(eq(notes.userId, userId)).orderBy(desc(notes.updatedAt));
}

/**
 * List a user's notes within one surah, in verse order.
 */
export async function listNotesForSurah(db: Database, userId: string, surah: number) {
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.surah, surah)))
    .orderBy(notes.verse);
}

/**
 * Create or replace the user's note on a verse.
 */
export async function saveNote(db: Database, userId: string, input: VerseRef & { body: string }) {
  const [note] = await db
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
export async function deleteNote(db: Database, userId: string, ref: VerseRef) {
  const [note] = await db
    .delete(notes)
    .where(and(eq(notes.userId, userId), eq(notes.surah, ref.surah), eq(notes.verse, ref.verse)))
    .returning();

  return note ?? null;
}
