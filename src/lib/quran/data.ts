import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { Chapter, SurahData, TafsirData, TafsirSlug } from './types.ts';

/**
 * Quran content is static JSON under /quran (built by `mise quran:fetch`).
 * Promises are cached so repeat navigation never refetches or reparses.
 */
const cache = new Map<string, Promise<unknown>>();
const resolved = new Map<string, unknown>();

function getJson<T>(path: string): Promise<T> {
  let hit = cache.get(path);
  if (!hit) {
    hit = fetch(path).then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
      const data = await res.json();
      resolved.set(path, data);
      return data;
    });
    hit.catch(() => cache.delete(path));
    cache.set(path, hit);
  }
  return hit as Promise<T>;
}

const surahPath = (surah: number) => `/quran/${surah}.json`;

export function getChapters(): Promise<Chapter[]> {
  return getJson('/quran/chapters.json');
}

/**
 * All 114 chapters; static for the life of the page.
 */
export function useChapters() {
  return useQuery({ queryKey: ['quran', 'chapters'], queryFn: getChapters, staleTime: Infinity, gcTime: Infinity });
}

export function getSurah(surah: number): Promise<SurahData> {
  return getJson(surahPath(surah));
}

/**
 * The already-loaded surah, if any — lets the reader skip the skeleton.
 */
export function getLoadedSurah(surah: number): SurahData | undefined {
  return resolved.get(surahPath(surah)) as SurahData | undefined;
}

export function getTafsir(source: TafsirSlug, surah: number): Promise<TafsirData> {
  return getJson(`/quran/tafsir/${source}/${surah}.json`);
}

export function isValidSurah(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 114;
}

/**
 * Subscribe a component to a surah load; returns undefined until it resolves.
 */
export function useSurah(surah: number): SurahData | undefined {
  const [data, setData] = useState(() => getLoadedSurah(surah));

  useEffect(() => {
    let cancelled = false;
    setData(getLoadedSurah(surah));
    getSurah(surah).then((loaded) => {
      if (!cancelled) setData(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [surah]);

  return data?.surah === surah ? data : undefined;
}

/**
 * Load every surah in idle time, reporting progress. Used by search.
 */
export async function loadAllSurahs(onProgress: (loaded: number) => void): Promise<SurahData[]> {
  const all: SurahData[] = [];
  for (let n = 1; n <= 114; n++) {
    all.push(await getSurah(n));
    onProgress(n);
  }
  return all;
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function toArabicNumber(n: number): string {
  return String(n).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);
}
