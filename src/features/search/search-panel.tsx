import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { Input } from '#/components/ui/input.tsx';
import { useT } from '#/lib/i18n.ts';
import { dockStore, resolveTranslation, usePrefs } from '#/lib/prefs.ts';
import { useChapters } from '#/lib/quran/data.ts';
import { searchIndexStore, searchVerses, warmSearch } from './search.api.ts';
import { normalizeLatin } from './search.lib.ts';

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
  const { loaded, ready } = searchIndexStore.use();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query.trim());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    // Re-focus when ⌘K is pressed while the panel is already open.
    return dockStore.subscribe(() => {
      if (dockStore.get() === 'search') inputRef.current?.focus();
    });
  }, []);

  useEffect(warmSearch, []);

  const search = useQuery({
    queryKey: ['search', lang, deferred],
    // Keeps its query, so highlights match the results on screen, not the newer text being searched.
    queryFn: async () => ({ query: deferred, hits: await searchVerses(deferred, lang) }),
    enabled: deferred.length >= 3,
    // Until the new answer arrives, the previous results stay up.
    placeholderData: keepPreviousData,
    // The index never changes while the app is open.
    staleTime: Number.POSITIVE_INFINITY,
  });
  const found = deferred.length >= 3 ? search.data : undefined;
  const results = found?.hits ?? [];

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
          {!ready
            ? t.searchLoading(Math.round((loaded / 114) * 100))
            : deferred.length > 0 && deferred.length < 3
              ? t.searchMinChars
              : deferred.length >= 3
                ? t.searchResults(results.length)
                : t.searchHint}
        </p>
      </div>
      <ol className="min-h-0 grow overflow-y-auto md:columns-2 md:gap-0">
        {results.map((r) => (
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
              {r.viaLatin ? (
                <span lang="ar-Latn" className="mt-1 line-clamp-3 block font-serif leading-snug text-gold-ink italic">
                  {r.text}
                </span>
              ) : (
                <span className="mt-1 line-clamp-3 block leading-snug">
                  {highlight(r.text, found?.query ?? deferred)}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
