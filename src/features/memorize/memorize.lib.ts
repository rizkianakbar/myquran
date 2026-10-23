import { addDays, daysBetween } from '#/features/plans/plans.lib.ts';
import type { Learning, Passage, PracticeRange, Practise, Step } from './memorize.types.ts';

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
 * What follows building one part of a verse: its meaning (when practising
 * both), else the next verse, else the whole passage (skipped for a single
 * verse, which is already the whole passage).
 */
export function stepAfterBuild(
  range: PracticeRange,
  verse: number,
  part: 'arabic' | 'meaning',
  practise: Practise,
): Step {
  if (part === 'arabic' && practise === 'both') return { kind: 'build', verse, part: 'meaning' };
  return stepAfterVerse(range, verse);
}

/**
 * After a verse is learned: the next verse, else the whole passage
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
 * One word of the text being built: as shown in the sentence, and as it
 * appears on its tile and is compared (`bare`, which ignores what a learner
 * can't be expected to match: vowel marks in Arabic, case and punctuation in
 * a translation).
 */
export interface BuildWord {
  /**
   * 0-based place in its verse; words repeat, so this is what identifies one.
   */
  position: number;
  shown: string;
  tile: string;
  bare: string;
}

export function arabicWords(words: { a: string }[]): BuildWord[] {
  return words.map(({ a }, position) => ({ position, shown: a, tile: a, bare: bareArabic(a) }));
}

const EDGE_PUNCTUATION = /^[\s"'“”‘’()[\]{}.,;:!?—–-]+|[\s"'“”‘’()[\]{}.,;:!?—–-]+$/g;

/**
 * A translation as words: shown with its punctuation, put on tiles without
 * it (Saheeh's bracketed glosses included, as plain words).
 */
export function meaningWords(text: string): BuildWord[] {
  return text
    .split(/\s+/)
    .map((shown) => {
      const tile = shown.replace(EDGE_PUNCTUATION, '');
      return { shown, tile, bare: tile.toLowerCase() };
    })
    .filter((word) => word.tile.length > 0)
    .map((word, position) => ({ position, ...word }));
}

/**
 * Which words to hide (indexes, in reading order): about half, between one
 * and six, anywhere in the verse. Seeded by the attempt, so each attempt is
 * a fresh puzzle but redraws don't reshuffle it.
 */
export function hiddenWords(seed: string, count: number): number[] {
  const hide = Math.min(6, Math.max(1, Math.round(count / 2)));
  return shuffled(
    Array.from({ length: count }, (_, i) => i),
    seededRandom(seed),
  )
    .slice(0, hide)
    .sort((a, b) => a - b);
}

export interface Tile {
  id: number;
  text: string;
}

/**
 * The word bank: the hidden words plus a few others from the same surah
 * that differ from all of them (so none is a second right answer), closest
 * in length first, shuffled together.
 */
export function wordBank(answer: BuildWord[], pool: BuildWord[], seed: string): Tile[] {
  const random = seededRandom(`${seed}:bank`);
  const taken = new Set(answer.map((word) => word.bare));
  const extras: BuildWord[] = [];
  for (const word of shuffled(pool, random)) {
    if (taken.has(word.bare)) continue;
    taken.add(word.bare);
    extras.push(word);
  }
  const length = answer.reduce((sum, word) => sum + word.bare.length, 0) / answer.length;
  extras.sort((a, b) => Math.abs(a.bare.length - length) - Math.abs(b.bare.length - length));
  const extraCount = Math.max(2, Math.min(4, 8 - answer.length));
  const texts = [...answer.map((word) => word.tile), ...extras.slice(0, extraCount).map((word) => word.tile)];
  return shuffled(texts, random).map((text, id) => ({ id, text }));
}

/**
 * Which gaps were filled right, gap by gap. Compared bare, so two copies of
 * the same word are interchangeable.
 */
export function checkGaps(answer: BuildWord[], placed: (string | null)[], bare: (tile: string) => string): boolean[] {
  return answer.map((word, i) => placed[i] !== null && placed[i] !== undefined && bare(placed[i]) === word.bare);
}
