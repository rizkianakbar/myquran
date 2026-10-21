import type { SurahData, Verse } from '#app/src/lib/quran/types.ts';

/**
 * One page of the Madinah mushaf, holding only this surah's verses (a page
 * shared with a neighbouring surah shows just our part, as the reader is in
 * this surah).
 */
export interface MushafPage {
  page: number;
  juz: number;
  verses: Verse[];
}

export function groupPages(surahData: SurahData): MushafPage[] {
  const pages: MushafPage[] = [];
  for (const verse of surahData.verses) {
    const current = pages.at(-1);
    if (current?.page === verse.page) current.verses.push(verse);
    else pages.push({ page: verse.page, juz: verse.juz, verses: [verse] });
  }
  return pages;
}
