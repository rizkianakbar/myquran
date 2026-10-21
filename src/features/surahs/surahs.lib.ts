import type { Chapter } from '#/lib/quran/types.ts';

/**
 * Latin transliterations vary ("Al-Fatihah", "al fatiha"); compare letters only.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9؀-ۿ]/g, '');
}

export function matchesChapter(chapter: Chapter, query: string): boolean {
  if (/^\d+$/.test(query)) return String(chapter.number).startsWith(query);
  const q = normalize(query);
  return [chapter.nameSimple, chapter.nameEn, chapter.nameId, chapter.nameArabic].some((name) =>
    normalize(name).includes(q),
  );
}
