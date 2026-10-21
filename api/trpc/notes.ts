import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { deleteNote, listNotes, listNotesForSurah, saveNote } from '#api/services/notes.ts';
import { protectedProcedure, router } from './init.ts';

/**
 * A verse reference. Verse 286 is the longest surah (Al-Baqarah).
 */
export const verseRefSchema = z.object({
  surah: z.number().int().min(1).max(114),
  verse: z.number().int().min(1).max(286),
});

/**
 * Personal notes on verses, owned by the authenticated user.
 */
export const notesRouter = router({
  /**
   * List all of the user's notes, most recently edited first.
   */
  list: protectedProcedure.query(({ ctx }) => listNotes(ctx, ctx.user.id)),

  /**
   * List the user's notes within one surah.
   */
  bySurah: protectedProcedure
    .input(z.object({ surah: verseRefSchema.shape.surah }))
    .query(({ ctx, input }) => listNotesForSurah(ctx, ctx.user.id, input.surah)),

  /**
   * Create or replace the user's note on a verse.
   */
  save: protectedProcedure
    .input(verseRefSchema.extend({ body: z.string().trim().min(1, 'Note is empty').max(10000) }))
    .mutation(({ ctx, input }) => saveNote(ctx, ctx.user.id, input)),

  /**
   * Delete the user's note on a verse.
   */
  delete: protectedProcedure.input(verseRefSchema).mutation(async ({ ctx, input }) => {
    const note = await deleteNote(ctx, ctx.user.id, input);

    if (!note) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Note not found',
      });
    }

    return note;
  }),
});
