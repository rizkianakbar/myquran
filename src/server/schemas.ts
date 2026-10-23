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

const dateKeySchema = z.iso.date();

/**
 * One day's portion of a reading plan, in mushaf pages.
 */
export const planDaySchema = z.object({
  date: dateKeySchema,
  fromPage: z.number().int().min(1).max(604),
  toPage: z.number().int().min(1).max(604),
});

export type PlanDay = z.infer<typeof planDaySchema>;

/**
 * A khatam plan as the client keeps it. `id` is made on the device that
 * starts the plan; `read` is the base64 verse bitset from `verse-set.ts`
 * (780 bytes, so 1040 characters).
 */
export const readingPlanSchema = z.object({
  id: z.uuid(),
  startDate: dateKeySchema,
  endDate: dateKeySchema,
  read: z.base64().max(1040),
  today: planDaySchema.nullable(),
  completedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export type ReadingPlan = z.infer<typeof readingPlanSchema>;
