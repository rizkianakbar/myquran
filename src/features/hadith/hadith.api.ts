import { queryOptions } from '@tanstack/react-query';
import type { Hadith, HadithBookContent, HadithGrade, HadithIndex } from './hadith.types.ts';

/**
 * hadith-api on jsDelivr (public domain): CORS-open, cached a week, and
 * served a book ("section") at a time. Pinned to the major version, so its
 * shape can't change under us.
 */
export const HADITH_CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1';

interface SourceHadith {
  hadithnumber: number;
  text: string;
  grades: HadithGrade[];
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * Join a book's Arabic and translation, which the source keeps as separate
 * editions, by hadith number. Either may lack a hadith the other has.
 */
export function joinEditions(arabic: SourceHadith[], translation: SourceHadith[]): Hadith[] {
  const byNumber = new Map<number, Hadith>();
  for (const h of arabic)
    byNumber.set(h.hadithnumber, { number: h.hadithnumber, arabic: h.text, translation: null, grades: h.grades });
  for (const h of translation) {
    const entry = byNumber.get(h.hadithnumber) ?? {
      number: h.hadithnumber,
      arabic: null,
      translation: null,
      grades: [],
    };
    byNumber.set(h.hadithnumber, { ...entry, translation: h.text, grades: h.grades.length ? h.grades : entry.grades });
  }
  return [...byNumber.values()].filter((h) => h.arabic || h.translation).sort((a, b) => a.number - b.number);
}

/**
 * A book in Arabic and the reader's language. Editions don't all have every
 * book (English lacks some of Muslim's), so a missing translation falls back
 * to English, then to the Arabic alone; only a book with neither fails.
 */
async function getBook(collection: string, book: number, lang: 'en' | 'id'): Promise<HadithBookContent> {
  const edition = (prefix: string) =>
    getJson<{ hadiths: SourceHadith[] }>(`${HADITH_CDN}/editions/${prefix}-${collection}/sections/${book}.min.json`)
      .then((data) => data.hadiths)
      .catch(() => null);
  const [arabic, preferred] = await Promise.all([edition('ara'), edition(lang === 'id' ? 'ind' : 'eng')]);
  const english = !preferred && lang === 'id' ? await edition('eng') : null;
  const translation = preferred ?? english;
  if (!arabic && !translation) throw new Error(`${collection} book ${book} is unavailable`);
  return {
    hadiths: joinEditions(arabic ?? [], translation ?? []),
    translatedIn: preferred ? lang : english ? 'en' : null,
  };
}

export const hadithQueries = {
  index: () =>
    queryOptions({
      queryKey: ['hadith', 'index'],
      queryFn: () => getJson<HadithIndex>('/hadith/index.json'),
      staleTime: Number.POSITIVE_INFINITY,
    }),
  book: (collection: string, book: number, lang: 'en' | 'id') =>
    queryOptions({
      queryKey: ['hadith', collection, book, lang],
      queryFn: () => getBook(collection, book, lang),
      staleTime: Number.POSITIVE_INFINITY,
    }),
};
