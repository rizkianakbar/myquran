import { z } from 'zod';

/**
 * A verse reference, e.g. `{ surah: 2, verse: 255 }`. Verse 286 is the
 * longest surah (Al-Baqarah).
 */
export const verseRefSchema = z.object({
  surah: z.number().int().min(1).max(114),
  verse: z.number().int().min(1).max(286),
});

export type VerseRef = z.infer<typeof verseRefSchema>;

export const noteInputSchema = verseRefSchema.extend({
  body: z.string().trim().min(1, 'Note is empty').max(10000),
});
