import { describe, expect, it } from 'vitest';
import chapters from '#/lib/quran/chapters.json' with { type: 'json' };
import { DAILY_VERSES, verseOfTheDay } from './home.lib.ts';

describe('verseOfTheDay', () => {
  it('only lists verses that exist', () => {
    for (const [surah, verse] of DAILY_VERSES) {
      expect(verse).toBeGreaterThanOrEqual(1);
      expect(verse).toBeLessThanOrEqual(chapters[surah - 1].versesCount);
    }
  });

  it('lists each verse once', () => {
    expect(new Set(DAILY_VERSES.map(([s, v]) => `${s}:${v}`)).size).toBe(DAILY_VERSES.length);
  });

  it('keeps one verse all day and changes the next', () => {
    const morning = verseOfTheDay(new Date(2026, 9, 23, 0, 1));
    expect(verseOfTheDay(new Date(2026, 9, 23, 23, 59))).toEqual(morning);
    expect(verseOfTheDay(new Date(2026, 9, 24, 0, 1))).not.toEqual(morning);
  });
});
