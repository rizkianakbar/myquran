export interface HadithBook {
  /**
   * The book's number in its collection (the source calls books "sections").
   */
  number: number;
  name: string;
  /**
   * Its hadith number range, as the source defines it (shown as is: counting
   * from it would be off, since ranges skip numbers).
   */
  first: number;
  last: number;
}

export interface HadithCollection {
  slug: string;
  name: string;
  /**
   * The short curated forties, offered first.
   */
  featured: boolean;
  /**
   * Translations the source has besides the Arabic.
   */
  translations: ('en' | 'id')[];
  books: HadithBook[];
  count: number;
}

export interface HadithIndex {
  collections: HadithCollection[];
}

export interface HadithGrade {
  name: string;
  grade: string;
}

/**
 * One hadith: its Arabic and translation joined by number.
 */
export interface Hadith {
  number: number;
  arabic: string | null;
  translation: string | null;
  grades: HadithGrade[];
}

/**
 * A book's hadith, and the language the translation came in: English when
 * the Indonesian edition lacks the book, null when no translation has it.
 */
export interface HadithBookContent {
  hadiths: Hadith[];
  translatedIn: 'en' | 'id' | null;
}
