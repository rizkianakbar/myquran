import { describe, expect, it } from 'vitest';
import { joinEditions } from './hadith.api.ts';

const h = (hadithnumber: number, text: string, grades: { name: string; grade: string }[] = []) => ({
  hadithnumber,
  text,
  grades,
});

describe('joinEditions', () => {
  it('pairs Arabic and translation by number, in order', () => {
    const joined = joinEditions([h(2, 'ب'), h(1, 'أ')], [h(1, 'One'), h(2, 'Two')]);
    expect(joined).toEqual([
      { number: 1, arabic: 'أ', translation: 'One', grades: [] },
      { number: 2, arabic: 'ب', translation: 'Two', grades: [] },
    ]);
  });

  it('keeps a hadith only one side has, and the translation’s gradings', () => {
    const grade = { name: 'Al-Albani', grade: 'Sahih' };
    const joined = joinEditions([h(1, 'أ'), h(2, 'ب')], [h(2, 'Two', [grade]), h(3, 'Three')]);
    expect(joined.map((x) => [x.number, !!x.arabic, !!x.translation])).toEqual([
      [1, true, false],
      [2, true, true],
      [3, false, true],
    ]);
    expect(joined[1].grades).toEqual([grade]);
  });

  it('drops hadith with no text on either side', () => {
    expect(joinEditions([h(1, '')], [h(1, '')])).toEqual([]);
  });
});
