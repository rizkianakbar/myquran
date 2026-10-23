import { useParams } from '@tanstack/react-router';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { RouterAnchor } from '#/components/router-anchor.tsx';
import { Input } from '#/components/ui/input.tsx';
import { chapterTranslatedName, useT } from '#/lib/i18n.ts';
import { dockStore, usePrefs } from '#/lib/prefs.ts';
import { useProgress } from '#/lib/progress.ts';
import { getSurah, useChapters } from '#/lib/quran/data.ts';
import { cn } from '#/lib/utils.ts';
import { matchesChapter } from './surahs.lib.ts';

export function SurahList() {
  const t = useT();
  const { language } = usePrefs();
  const { furthest } = useProgress();
  const { data: chapters = [] } = useChapters();
  const params = useParams({ strict: false }) as { surah?: string };
  const current = Number(params.surah);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => (deferredQuery ? chapters.filter((c) => matchesChapter(c, deferredQuery)) : chapters),
    [chapters, deferredQuery],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll only when the current surah or list size changes
  useEffect(() => {
    const reveal = () => listRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
    reveal();
    // The phone sheet stays mounted while closed; reveal the current surah again when it reopens.
    return dockStore.subscribe(() => {
      if (dockStore.get() === 'surahs') requestAnimationFrame(reveal);
    });
  }, [current, chapters.length]);

  return (
    <div className="flex min-h-0 grow flex-col">
      <div className="border-b px-5 py-3">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.filterSurahs}
          aria-label={t.filterSurahs}
        />
      </div>

      <div
        ref={listRef}
        className="grid min-h-0 grow auto-rows-min gap-x-2 overflow-y-auto p-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && (
          <p className="col-span-full px-3 py-6 text-center text-sm text-muted-foreground">
            {t.noSurahMatch} “{deferredQuery}”
          </p>
        )}

        {filtered.map((chapter) => {
          const read = furthest[chapter.number] ?? 0;
          const pct = Math.round((read / chapter.versesCount) * 100);

          return (
            <RouterAnchor
              key={chapter.number}
              href={`/surah/${chapter.number}`}
              // Start fetching on hover or touch, before the click lands.
              onMouseEnter={() => void getSurah(chapter.number)}
              onTouchStart={() => void getSurah(chapter.number)}
              aria-current={chapter.number === current ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted',
                chapter.number === current && 'bg-muted',
              )}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md border text-xs text-muted-foreground tabular-nums">
                {chapter.number}
              </span>

              <span className="min-w-0 grow">
                <span className="block truncate font-serif">{chapter.nameSimple}</span>

                <span className="block truncate text-xs text-muted-foreground">
                  {chapterTranslatedName(chapter, language)}
                  <span className="ml-2">{t.verses(chapter.versesCount)}</span>
                </span>

                {read > 0 && (
                  <span className="mt-1 block h-0.5 overflow-hidden rounded-full bg-border">
                    <span className="block h-full bg-gold" style={{ width: `${pct}%` }} />
                  </span>
                )}
              </span>

              <span dir="rtl" lang="ar" className="shrink-0 font-kufi text-base text-gold-ink">
                {chapter.nameArabic}
              </span>
            </RouterAnchor>
          );
        })}
      </div>
    </div>
  );
}
