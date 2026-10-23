import { addDays, daysBetween } from '#/features/plans/plans.lib.ts';
import type { Learning, Passage, PracticeRange, Step } from './memorize.types.ts';

export const LISTEN_REPEATS = [1, 3, 5, 7] as const;

/**
 * Days until the next review after each solid review in a row: tomorrow,
 * then spreading out as the passage settles (capped at the last).
 */
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60] as const;

/**
 * Verses per passage when suggesting what to learn next.
 */
const DEFAULT_PASSAGE = 5;

/**
 * "Al-Mulk 1–5" (or "Al-Mulk 3" for a single verse).
 */
export function passageLabel(surahName: string | undefined, range: PracticeRange): string {
  const verses = range.from === range.to ? `${range.from}` : `${range.from}–${range.to}`;
  return `${surahName ?? `Surah ${range.surah}`} ${verses}`;
}

export function passageId(range: PracticeRange): string {
  return `${range.surah}:${range.from}-${range.to}`;
}

export function sameRange(a: PracticeRange | null | undefined, b: PracticeRange): boolean {
  return !!a && a.surah === b.surah && a.from === b.from && a.to === b.to;
}

/**
 * A range read from the URL, clamped to the surah; null if there is none.
 */
export function parseRange(
  search: { surah?: unknown; from?: unknown; to?: unknown },
  versesIn: (surah: number) => number | undefined,
): PracticeRange | null {
  const surah = Number(search.surah);
  const count = Number.isInteger(surah) ? versesIn(surah) : undefined;
  if (!count) return null;
  const from = Math.min(Math.max(1, Math.trunc(Number(search.from) || 1)), count);
  const to = Math.min(Math.max(from, Math.trunc(Number(search.to) || from)), count);
  return { surah, from, to };
}

/**
 * What to learn after a passage: the same number of verses that follow it,
 * or the start of the next surah once this one is done.
 */
export function nextPassage(
  range: PracticeRange,
  versesIn: (surah: number) => number | undefined,
): PracticeRange | null {
  const count = versesIn(range.surah);
  if (!count) return null;
  const size = range.to - range.from + 1;
  if (range.to < count) return { surah: range.surah, from: range.to + 1, to: Math.min(count, range.to + size) };
  const nextSurah = range.surah + 1;
  const nextCount = versesIn(nextSurah);
  return nextCount ? { surah: nextSurah, from: 1, to: Math.min(nextCount, DEFAULT_PASSAGE) } : null;
}

/**
 * Where a learning session starts: the first verse not learned yet, or
 * reciting the whole passage once every verse is.
 */
export function firstStep(range: PracticeRange, learning: Learning | null): Step {
  const learned = sameRange(learning?.range, range) ? new Set(learning?.learned) : new Set<number>();
  for (let verse = range.from; verse <= range.to; verse++) if (!learned.has(verse)) return { kind: 'listen', verse };
  return range.from === range.to ? { kind: 'done' } : { kind: 'connect' };
}

/**
 * After "I got it" on a verse: the next verse, else the whole passage
 * (skipped for a single verse, which is already the whole passage).
 */
export function stepAfterVerse(range: PracticeRange, verse: number): Step {
  if (verse < range.to) return { kind: 'listen', verse: verse + 1 };
  return range.from === range.to ? { kind: 'done' } : { kind: 'connect' };
}

/**
 * A newly memorized passage, first due for review tomorrow.
 */
export function memorizedPassage(range: PracticeRange, today: string): Passage {
  return { ...range, learned: today, streak: 0, due: addDays(today, REVIEW_INTERVALS[0]) };
}

/**
 * The passage after a review: a solid one waits longer next time, a weak
 * one comes back tomorrow and starts the spacing over.
 */
export function reviewedPassage(passage: Passage, solid: boolean, today: string): Passage {
  const streak = solid ? passage.streak + 1 : 0;
  const interval = REVIEW_INTERVALS[Math.min(streak, REVIEW_INTERVALS.length - 1)];
  return { ...passage, streak, due: addDays(today, interval) };
}

/**
 * Passages due today or overdue, most overdue first.
 */
export function duePassages(passages: Passage[], today: string): Passage[] {
  return passages.filter((p) => p.due <= today).sort((a, b) => a.due.localeCompare(b.due));
}

/**
 * Days from today until a passage is due (0 when due or overdue).
 */
export function daysUntilDue(passage: Passage, today: string): number {
  return Math.max(0, daysBetween(today, passage.due));
}

/**
 * A small seeded random generator (mulberry32), so a verse's quiz comes out
 * the same every time it is drawn rather than reshuffling on each render.
 */
function seededRandom(seed: string): () => number {
  let state = 0;
  for (const char of seed) state = (Math.imul(31, state) + char.charCodeAt(0)) | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * An Arabic word with its vowel marks, Quranic annotation marks and tatweel
 * removed, and alef forms folded: two words a reader could tell apart only
 * by their marks count as the same word here.
 */
export function bareArabic(word: string): string {
  return word.replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '').replace(/[آأإٱ]/g, 'ا');
}

/**
 * Which words of a verse the quiz blanks out (1-based, in reading order):
 * one for a short verse, up to three for a long one, never the first word
 * (the reader's prompt) unless it is the only one.
 */
export function quizBlanks(verseKey: string, wordCount: number): number[] {
  if (wordCount <= 1) return [1];
  const count = wordCount <= 3 ? 1 : wordCount <= 6 ? 2 : 3;
  const candidates = Array.from({ length: wordCount - 1 }, (_, i) => i + 2);
  return shuffled(candidates, seededRandom(verseKey))
    .slice(0, count)
    .sort((a, b) => a - b);
}

/**
 * Up to four choices for one blank: the right word and others from the same
 * surah that differ from it in their letters (not just their marks), the
 * closest in length first, so the right one can't be spotted by its size.
 */
export function quizChoices(correct: string, pool: string[], seed: string, count = 4): string[] {
  const random = seededRandom(seed);
  const target = bareArabic(correct);
  const seen = new Set([target]);
  const others: string[] = [];
  for (const word of shuffled(pool, random)) {
    const bare = bareArabic(word);
    if (seen.has(bare)) continue;
    seen.add(bare);
    others.push(word);
  }
  others.sort(
    (a, b) => Math.abs(bareArabic(a).length - target.length) - Math.abs(bareArabic(b).length - target.length),
  );
  return shuffled([correct, ...others.slice(0, count - 1)], random);
}
