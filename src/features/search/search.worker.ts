/// <reference lib="webworker" />

import type { SurahData } from '#/lib/quran/types.ts';
import { ARABIC_SCRIPT, compactLatin, normalizeArabic, normalizeLatin } from './search.lib.ts';
import type { SearchHit, SearchRequest, SearchResponse } from './search.types.ts';

/**
 * Full-text search over all 6,236 verses, off the main thread: fetching and
 * parsing 114 files (~11 MB) and folding their text would otherwise stall
 * the sheet as it opens. The index is built once and kept for the session.
 */

const MAX_RESULTS = 200;
const CONCURRENCY = 8;

interface IndexedVerse {
  surah: number;
  verse: number;
  en: string;
  id: string;
  latin: string;
  searchArabic: string;
  searchEn: string;
  searchId: string;
  searchLatin: string;
}

let index: IndexedVerse[] | null = null;
let building: Promise<IndexedVerse[]> | null = null;

const post = (message: SearchResponse) => self.postMessage(message);

async function build(): Promise<IndexedVerse[]> {
  const surahs: SurahData[] = new Array(114);
  let next = 1;
  let loaded = 0;
  const worker = async () => {
    while (next <= 114) {
      const n = next++;
      const res = await fetch(`/quran/${n}.json`);
      if (!res.ok) throw new Error(`Failed to load surah ${n}: ${res.status}`);
      surahs[n - 1] = await res.json();
      post({ type: 'progress', loaded: ++loaded });
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return surahs.flatMap((s) =>
    s.verses.map((v) => ({
      surah: s.surah,
      verse: v.n,
      en: v.en,
      id: v.id,
      latin: v.latinId,
      searchArabic: normalizeArabic(v.arabic),
      searchEn: normalizeLatin(v.en),
      searchId: normalizeLatin(v.id),
      // Both styles, so either spelling finds the verse.
      searchLatin: compactLatin(`${v.latinId} ${v.latinEn}`),
    })),
  );
}

function search(verses: IndexedVerse[], query: string, lang: 'en' | 'id'): SearchHit[] {
  const isArabic = ARABIC_SCRIPT.test(query);
  const needle = isArabic ? normalizeArabic(query) : normalizeLatin(query);
  const latinNeedle = compactLatin(query);
  const field = lang === 'en' ? 'searchEn' : 'searchId';
  const hits: SearchHit[] = [];
  for (const v of verses) {
    if (isArabic ? v.searchArabic.includes(needle) : v[field].includes(needle)) {
      hits.push({ surah: v.surah, verse: v.verse, text: v[lang], viaLatin: false });
    } else if (!isArabic && latinNeedle.length >= 3 && v.searchLatin.includes(latinNeedle)) {
      hits.push({ surah: v.surah, verse: v.verse, text: v.latin, viaLatin: true });
    }
    if (hits.length >= MAX_RESULTS) break;
  }
  return hits;
}

self.onmessage = async (event: MessageEvent<SearchRequest>) => {
  const message = event.data;
  try {
    building ??= build();
    index ??= await building;
    if (message.type === 'init') return post({ type: 'ready' });
    post({ type: 'results', id: message.id, hits: search(index, message.query, message.lang) });
  } catch (error) {
    building = null;
    post({ type: 'error', message: error instanceof Error ? error.message : 'Search failed' });
  }
};
