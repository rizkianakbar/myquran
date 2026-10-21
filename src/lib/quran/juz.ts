import type { Chapter } from './types.ts';

/**
 * Where each of the 30 juz' begins, as [surah, verse]. Matches the `juz` field
 * in the surah files; kept here so the header can show it before they load.
 */
const JUZ_STARTS: readonly (readonly [number, number])[] = [
  [1, 1],
  [2, 142],
  [2, 253],
  [3, 93],
  [4, 24],
  [4, 148],
  [5, 82],
  [6, 111],
  [7, 88],
  [8, 41],
  [9, 93],
  [11, 6],
  [12, 53],
  [15, 1],
  [17, 1],
  [18, 75],
  [21, 1],
  [23, 1],
  [25, 21],
  [27, 56],
  [29, 46],
  [33, 31],
  [36, 28],
  [39, 32],
  [41, 47],
  [46, 1],
  [51, 31],
  [58, 1],
  [67, 1],
  [78, 1],
];

export function juzOf(surah: number, verse: number): number {
  let juz = 1;
  for (let i = 1; i < JUZ_STARTS.length; i++) {
    const [s, v] = JUZ_STARTS[i];
    if (surah > s || (surah === s && verse >= v)) juz = i + 1;
    else break;
  }
  return juz;
}

export function juzRange(chapter: Chapter): string {
  const from = juzOf(chapter.number, 1);
  const to = juzOf(chapter.number, chapter.versesCount);
  return from === to ? `${from}` : `${from}–${to}`;
}
