import { describe, expect, it } from 'vitest';
import {
  arabicWords,
  bareArabic,
  checkGaps,
  daysUntilDue,
  duePassages,
  firstStep,
  hiddenWords,
  meaningWords,
  memorizedPassage,
  nextPassage,
  parseRange,
  reviewedPassage,
  stepAfterBuild,
  stepAfterVerse,
  wordBank,
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

describe('the word bank', () => {
  const ikhlas = arabicWords(['قُلْ', 'هُوَ', 'ٱللَّهُ', 'أَحَدٌ', 'ٱللَّهُ', 'ٱلصَّمَدُ', 'لَمْ', 'يَلِدْ'].map((a) => ({ a })));

  it('folds away vowel and Quranic marks, so look-alikes count as the same word', () => {
    expect(bareArabic('ٱللَّهُ')).toBe(bareArabic('اللَّهِ'));
    expect(bareArabic('أَحَدٌ')).toBe('احد');
  });

  it('hides about half the words, anywhere, the same for the same attempt', () => {
    expect(hiddenWords('112:1:arabic:0', 1)).toEqual([0]);
    expect(hiddenWords('112:1:arabic:0', 8)).toHaveLength(4);
    expect(hiddenWords('2:255:arabic:0', 50)).toHaveLength(6);
    expect(hiddenWords('112:1:arabic:0', 8)).toEqual(hiddenWords('112:1:arabic:0', 8));
    // Over many attempts the gaps land everywhere, the first word included.
    const seen = new Set(Array.from({ length: 40 }, (_, n) => hiddenWords(`112:1:arabic:${n}`, 8)).flat());
    expect(seen.size).toBe(8);
  });

  it('holds every hidden word, plus extras that are never a second right answer', () => {
    const answer = [ikhlas[2], ikhlas[3]];
    const pool = [...ikhlas, ...arabicWords([{ a: 'اللَّهِ' }, { a: 'يُولَدْ' }, { a: 'كُفُوًا' }])];
    const bank = wordBank(answer, pool, 'seed');
    const texts = bank.map((tile) => tile.text);
    expect(texts).toEqual(expect.arrayContaining(['ٱللَّهُ', 'أَحَدٌ']));
    expect(texts).not.toContain('اللَّهِ');
    expect(new Set(bank.map((tile) => bareArabic(tile.text))).size).toBe(bank.length);
    expect(bank.length).toBeGreaterThanOrEqual(4);
  });

  it('marks each gap right or wrong, treating repeated words as interchangeable', () => {
    const answer = [ikhlas[2], ikhlas[4]];
    expect(checkGaps(answer, ['ٱللَّهُ', 'ٱللَّهُ'], bareArabic)).toEqual([true, true]);
    expect(checkGaps(answer, ['ٱللَّهُ', 'أَحَدٌ'], bareArabic)).toEqual([true, false]);
    expect(checkGaps(answer, ['ٱللَّهُ', null], bareArabic)).toEqual([true, false]);
  });

  it('splits a translation into tiles without punctuation or case', () => {
    const words = meaningWords('Say, "He is Allāh, [who is] One,');
    expect(words.map((w) => w.tile)).toEqual(['Say', 'He', 'is', 'Allāh', 'who', 'is', 'One']);
    expect(words[1]).toMatchObject({ position: 1, shown: '"He', bare: 'he' });
  });

  it('builds the meaning after the Arabic only when practising both', () => {
    expect(stepAfterBuild(IKHLAS, 1, 'arabic', 'both')).toEqual({ kind: 'build', verse: 1, part: 'meaning' });
    expect(stepAfterBuild(IKHLAS, 1, 'arabic', 'arabic')).toEqual({ kind: 'listen', verse: 2 });
    expect(stepAfterBuild(IKHLAS, 4, 'meaning', 'both')).toEqual({ kind: 'connect' });
  });
});
