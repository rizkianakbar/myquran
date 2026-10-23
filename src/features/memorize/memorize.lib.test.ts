import { describe, expect, it } from 'vitest';
import {
  bareArabic,
  daysUntilDue,
  duePassages,
  firstStep,
  memorizedPassage,
  nextPassage,
  parseRange,
  quizBlanks,
  quizChoices,
  reviewedPassage,
  stepAfterVerse,
} from './memorize.lib.ts';
import type { PracticeRange } from './memorize.types.ts';

const IKHLAS: PracticeRange = { surah: 112, from: 1, to: 4 };
const versesIn = (surah: number) => ({ 2: 286, 112: 4, 113: 5, 114: 6 })[surah];

describe('the learning steps', () => {
  it('starts at the first verse, or carries on after the ones already learned', () => {
    expect(firstStep(IKHLAS, null)).toEqual({ kind: 'listen', verse: 1 });
    expect(firstStep(IKHLAS, { range: IKHLAS, learned: [1, 2] })).toEqual({ kind: 'listen', verse: 3 });
    // Progress on another passage doesn't count here.
    expect(firstStep(IKHLAS, { range: { surah: 113, from: 1, to: 5 }, learned: [1, 2] })).toEqual({
      kind: 'listen',
      verse: 1,
    });
  });

  it('goes to the next verse, then to the whole passage', () => {
    expect(stepAfterVerse(IKHLAS, 2)).toEqual({ kind: 'listen', verse: 3 });
    expect(stepAfterVerse(IKHLAS, 4)).toEqual({ kind: 'connect' });
    expect(firstStep(IKHLAS, { range: IKHLAS, learned: [1, 2, 3, 4] })).toEqual({ kind: 'connect' });
  });

  it('skips the whole-passage step for a single verse', () => {
    const ayatulKursi = { surah: 2, from: 255, to: 255 };
    expect(stepAfterVerse(ayatulKursi, 255)).toEqual({ kind: 'done' });
  });
});

describe('nextPassage', () => {
  it('offers the same number of verses that follow, then the next surah', () => {
    expect(nextPassage({ surah: 2, from: 1, to: 5 }, versesIn)).toEqual({ surah: 2, from: 6, to: 10 });
    expect(nextPassage({ surah: 113, from: 1, to: 3 }, versesIn)).toEqual({ surah: 113, from: 4, to: 5 });
    expect(nextPassage(IKHLAS, versesIn)).toEqual({ surah: 113, from: 1, to: 5 });
    expect(nextPassage({ surah: 114, from: 1, to: 6 }, versesIn)).toBeNull();
  });
});

describe('reviews', () => {
  const today = '2026-10-23';

  it('brings a new passage back tomorrow, then less often after each solid review', () => {
    let passage = memorizedPassage(IKHLAS, today);
    expect(passage.due).toBe('2026-10-24');
    const gaps = [1, 2, 3, 4].map(() => {
      passage = reviewedPassage(passage, true, today);
      return daysUntilDue(passage, today);
    });
    expect(gaps).toEqual([3, 7, 14, 30]);
  });

  it('starts the spacing over after a weak review', () => {
    const settled = { ...memorizedPassage(IKHLAS, today), streak: 4 };
    expect(reviewedPassage(settled, false, today)).toMatchObject({ streak: 0, due: '2026-10-24' });
  });

  it('lists what is due, most overdue first', () => {
    const passages = [
      { ...IKHLAS, learned: today, streak: 1, due: '2026-10-22' },
      { surah: 113, from: 1, to: 5, learned: today, streak: 0, due: '2026-10-30' },
      { surah: 114, from: 1, to: 6, learned: today, streak: 2, due: '2026-10-20' },
    ];
    expect(duePassages(passages, today).map((p) => p.surah)).toEqual([114, 112]);
  });
});

describe('parseRange', () => {
  it('reads a passage and clamps it to the surah', () => {
    expect(parseRange({ surah: 112, from: 2, to: 9 }, versesIn)).toEqual({ surah: 112, from: 2, to: 4 });
    expect(parseRange({ surah: 2, from: 255 }, versesIn)).toEqual({ surah: 2, from: 255, to: 255 });
  });

  it('gives null without a real surah, so the Memorize home shows', () => {
    expect(parseRange({}, versesIn)).toBeNull();
    expect(parseRange({ surah: 999 }, versesIn)).toBeNull();
  });
});

describe('the fill-the-gap quiz', () => {
  it('folds away vowel and Quranic marks, so look-alikes count as the same word', () => {
    expect(bareArabic('ٱللَّهُ')).toBe(bareArabic('اللَّهِ'));
    expect(bareArabic('أَحَدٌ')).toBe('احد');
  });

  it('blanks a few words, never the first (the prompt), the same every time', () => {
    expect(quizBlanks('112:1', 1)).toEqual([1]);
    expect(quizBlanks('112:1', 3)).toHaveLength(1);
    const long = quizBlanks('2:255', 50);
    expect(long).toHaveLength(3);
    expect(long).not.toContain(1);
    expect(quizBlanks('2:255', 50)).toEqual(long);
  });

  it('offers the right word among others that differ in their letters', () => {
    const pool = ['قُلْ', 'هُوَ', 'ٱللَّهُ', 'أَحَدٌ', 'ٱلصَّمَدُ', 'لَمْ', 'يَلِدْ', 'وَلَمْ', 'يُولَدْ', 'ٱللَّهِ'];
    const choices = quizChoices('ٱللَّهُ', pool, '112:2:1');
    expect(choices).toHaveLength(4);
    expect(choices).toContain('ٱللَّهُ');
    // 'ٱللَّهِ' is the same word with another vowel: never offered as a wrong choice.
    expect(choices).not.toContain('ٱللَّهِ');
    expect(new Set(choices.map(bareArabic)).size).toBe(4);
    expect(quizChoices('ٱللَّهُ', pool, '112:2:1')).toEqual(choices);
  });
});
