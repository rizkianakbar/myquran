import { useQuery } from '@tanstack/react-query';
import { getTafsir } from '#/lib/quran/data.ts';
import { sanitizeHtml, type TafsirSource } from './tafsir.lib.ts';

/**
 * The tafsir passage covering a verse, sanitized when the source is HTML.
 */
export function useTafsirEntry(source: TafsirSource, surah: number, verse: number) {
  return useQuery({
    queryKey: ['quran', 'tafsir', source.slug, surah, verse],
    staleTime: Infinity,
    queryFn: async () => {
      const data = await getTafsir(source.slug, surah);
      const entry = data.entries.find((e) => verse >= e.from && verse <= e.to);
      if (!entry) return null;
      return { ...entry, text: source.html ? sanitizeHtml(entry.text) : entry.text };
    },
  });
}
