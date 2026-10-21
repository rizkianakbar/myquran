import { Link } from '@tanstack/react-router';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '#app/src/lib/i18n.ts';
import { dockStore, resolveTranslation, usePrefs } from '#app/src/lib/prefs.ts';
import { loadAllSurahs, useChapters } from '#app/src/lib/quran/data.ts';
import type { SurahData } from '#app/src/lib/quran/types.ts';
import { Input } from '#assets/components/ui/input.tsx';

const MAX_RESULTS = 200;

/**
 * Strip harakat and Quranic annotation marks so a plain-typed Arabic query
 * matches the fully vocalized Uthmani text; alef variants fold to bare alef.
 */
function normalizeArabic(text: string): string {
  return text.replace(/[ؐ-ًؚ-ٰٟۖ-ۭ]/g, '').replace(/[آأإٱ]/g, 'ا');
}

function normalizeLatin(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

interface IndexedVerse {
  surah: number;
  verse: number;
  arabic: string;
  translation: string;
  latin: string;
  searchArabic: string;
  searchTranslation: string;
  searchLatin: string;
}

/**
 * Transliterations vary in hyphens, apostrophes and spacing ("bismillahir-
 * rahmanir" vs "bismillah ar-rahman"), so compare letters only.
 */
function compactLatin(text: string): string {
  return normalizeLatin(text).replace(/[^a-z0-9]/g, '');
}

let indexPromise: Promise<SurahData[]> | null = null;

function useSearchIndex() {
  const [surahs, setSurahs] = useState<SurahData[] | null>(null);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    let cancelled = false;
    indexPromise ??= loadAllSurahs((n) => !cancelled && setLoaded(n));
    indexPromise.then((all) => !cancelled && setSurahs(all));
    return () => {
      cancelled = true;
    };
  }, []);

  return { surahs, loaded };
}

function highlight(text: string, query: string) {
  const at = normalizeLatin(text).indexOf(normalizeLatin(query));
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-highlight px-0.5 text-highlight-foreground">
        {text.slice(at, at + query.length)}
      </mark>
      {text.slice(at + query.length)}
    </>
  );
}

export function SearchPanel() {
  const t = useT();
  const prefs = usePrefs();
  const lang = resolveTranslation(prefs) ?? prefs.language;
  const { data: chapters = [] } = useChapters();
  const { surahs, loaded } = useSearchIndex();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query.trim());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    // Re-focus when ⌘K is pressed while the panel is already open.
    return dockStore.subscribe(() => {
      if (dockStore.get() === 'search') inputRef.current?.focus();
    });
  }, []);

  const index = useMemo<IndexedVerse[]>(
    () =>
      (surahs ?? []).flatMap((s) =>
        s.verses.map((v) => ({
          surah: s.surah,
          verse: v.n,
          arabic: v.arabic,
          translation: v[lang],
          latin: v.latinId,
          searchArabic: normalizeArabic(v.arabic),
          searchTranslation: normalizeLatin(v[lang]),
          // Both styles, so either spelling finds the verse.
          searchLatin: compactLatin(`${v.latinId} ${v.latinEn}`),
        })),
      ),
    [surahs, lang],
  );

  const results = useMemo(() => {
    if (deferred.length < 3) return [];
    const isArabic = /[؀-ۿ]/.test(deferred);
    const needle = isArabic ? normalizeArabic(deferred) : normalizeLatin(deferred);
    const latinNeedle = compactLatin(deferred);
    const found: { verse: IndexedVerse; viaLatin: boolean }[] = [];
    for (const verse of index) {
      if (isArabic ? verse.searchArabic.includes(needle) : verse.searchTranslation.includes(needle)) {
        found.push({ verse, viaLatin: false });
      } else if (!isArabic && latinNeedle.length >= 3 && verse.searchLatin.includes(latinNeedle)) {
        found.push({ verse, viaLatin: true });
      }
      if (found.length >= MAX_RESULTS) break;
    }
    return found;
  }, [index, deferred]);

  return (
    <div className="flex min-h-0 grow flex-col">
      <div className="space-y-2 border-b px-5 py-3">
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
        />
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {!surahs
            ? t.searchLoading(Math.round((loaded / 114) * 100))
            : deferred.length > 0 && deferred.length < 3
              ? t.searchMinChars
              : deferred.length >= 3
                ? t.searchResults(results.length)
                : t.searchHint}
        </p>
      </div>
      <ol className="min-h-0 grow overflow-y-auto md:columns-2 md:gap-0">
        {results.map(({ verse: r, viaLatin }) => (
          <li key={`${r.surah}:${r.verse}`} className="break-inside-avoid border-b">
            <Link
              to="/surah/$surah"
              params={{ surah: r.surah }}
              hash={`v${r.verse}`}
              className="block px-5 py-3 text-sm transition-colors hover:bg-muted">
              <span className="text-xs font-medium text-muted-foreground">
                {chapters[r.surah - 1]?.nameSimple}{' '}
                <span className="ml-1 text-gold-ink tabular-nums">
                  {r.surah}:{r.verse}
                </span>
              </span>
              {viaLatin ? (
                <span lang="ar-Latn" className="mt-1 line-clamp-3 block font-serif leading-snug text-gold-ink italic">
                  {r.latin}
                </span>
              ) : (
                <span className="mt-1 line-clamp-3 block leading-snug">{highlight(r.translation, deferred)}</span>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
