export interface Chapter {
  number: number;
  nameArabic: string;
  nameSimple: string;
  nameEn: string;
  nameId: string;
  revelationPlace: 'makkah' | 'madinah';
  revelationOrder: number;
  bismillahPre: boolean;
  versesCount: number;
  pages: [number, number];
}

/**
 * One Arabic word with its English and Indonesian glosses and its
 * transliteration (`t`).
 */
export interface Word {
  a: string;
  en: string;
  id: string;
  t: string;
}

export interface Verse {
  n: number;
  key: string;
  arabic: string;
  page: number;
  juz: number;
  en: string;
  id: string;
  /**
   * Transliteration: quran.com's for English readers, Kemenag's (the style
   * printed in Indonesian mushafs) for Indonesian readers.
   */
  latinEn: string;
  latinId: string;
  words: Word[];
}

export interface SurahData {
  version: number;
  surah: number;
  verses: Verse[];
}

/**
 * A tafsir passage; passages covering several consecutive verses are stored once.
 */
export interface TafsirEntry {
  from: number;
  to: number;
  text: string;
}

export interface TafsirData {
  surah: number;
  source: string;
  entries: TafsirEntry[];
}

export type TafsirSlug = 'ibn-kathir' | 'kemenag';
