import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { db } from './db.server.ts';
import { authMiddleware } from './middleware.ts';
import { deleteNote, listNotes, listNotesForSurah, saveNote } from './notes.server.ts';
import { noteInputSchema, verseRefSchema } from './schemas.ts';

/**
 * List all of the user's notes, most recently edited first.
 */
export const listNotesFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => listNotes(db, context.user.id));

/**
 * List the user's notes within one surah.
 */
export const listNotesForSurahFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(z.object({ surah: verseRefSchema.shape.surah }))
  .handler(({ context, data }) => listNotesForSurah(db, context.user.id, data.surah));

/**
 * Create or replace the user's note on a verse.
 */
export const saveNoteFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(noteInputSchema)
  .handler(({ context, data }) => saveNote(db, context.user.id, data));

/**
 * Delete the user's note on a verse.
 */
export const deleteNoteFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(verseRefSchema)
  .handler(async ({ context, data }) => {
    const note = await deleteNote(db, context.user.id, data);
    if (!note) throw new Error('Note not found');
    return note;
  });

/**
 * Query keys and options for notes. Invalidate `notesQueries.all` after any
 * write to refresh both the full list and per-surah lists.
 */
export const notesQueries = {
  all: ['notes'] as const,
  list: () => queryOptions({ queryKey: [...notesQueries.all, 'list'], queryFn: () => listNotesFn() }),
  bySurah: (surah: number) =>
    queryOptions({
      queryKey: [...notesQueries.all, 'surah', surah],
      queryFn: () => listNotesForSurahFn({ data: { surah } }),
    }),
};
