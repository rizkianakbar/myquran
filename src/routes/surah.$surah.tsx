import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MushafSheet } from '#/components/mushaf/mushaf-sheet.tsx';
import { groupPages } from '#/components/mushaf/pages.ts';
import { JuzMarker, SurahEnd, VerseDivider } from '#/components/ornament/dividers.tsx';
import { Headpiece } from '#/components/ornament/headpiece.tsx';
import { RunningHead } from '#/components/reader/running-head.tsx';
import { SurahControls, type SurahControlsProps, type SurahPlayback } from '#/components/reader/surah-controls.tsx';
import { VerseCard, type VerseCardProps } from '#/components/reader/verse-card.tsx';
import { WordPopover, type WordSelection } from '#/components/reader/word-popover.tsx';
import { authClient } from '#/lib/auth-client.ts';
import { followStore, idleFollow, RESUME_FOLLOW_MS, setReturnToRecitation } from '#/lib/follow.ts';
import { chapterTranslatedName, useT } from '#/lib/i18n.ts';
import { play, togglePause, usePlayer, warm } from '#/lib/player.ts';
import { resolveLatin, resolveTranslation, setPref, usePrefs } from '#/lib/prefs.ts';
import { progressStore, recordRead, setLastRead } from '#/lib/progress.ts';
import { chaptersQuery, getSurah, isValidSurah, useChapters, useSurah } from '#/lib/quran/data.ts';
import type { SurahData, Verse } from '#/lib/quran/types.ts';
import { useShortcut } from '#/lib/shortcuts.ts';
import { bookmarksQueries, toggleBookmarkFn } from '#/server/bookmarks.functions.ts';
import { notesQueries } from '#/server/notes.functions.ts';

export const Route = createFileRoute('/surah/$surah')({
  params: {
    parse: ({ surah }) => {
      const n = Number(surah);
      if (!isValidSurah(n)) throw notFound();
      return { surah: n };
    },
    stringify: ({ surah }) => ({ surah: String(surah) }),
  },
  // Load the static JSON before rendering, so the page appears whole instead
  // of swapping a skeleton for verses of a different height. The skeleton is
  // only shown if the load is slow enough to notice.
  loader: async ({ context, params }) => {
    await Promise.all([context.queryClient.ensureQueryData(chaptersQuery), getSurah(params.surah)]);
  },
  pendingMs: 300,
  pendingComponent: SurahPending,
  errorComponent: SurahLoadError,
  component: SurahPage,
  notFoundComponent: SurahNotFound,
});

const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
const BISMILLAH_LATIN = { kemenag: 'Bismillāhir-raḥmānir-raḥīm', simple: 'Bismillahir rahmanir raheem' };

function SurahPending() {
  return (
    <main className="min-w-0 grow overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 pb-40 sm:px-6 lg:px-10">
        <header className="pt-8 pb-10 sm:pt-10">
          <div className="aspect-1000/240 w-full animate-pulse rounded-2xl bg-muted" />
        </header>
        <VerseSkeleton />
      </div>
    </main>
  );
}

function SurahLoadError() {
  const t = useT();
  return <main className="grow p-10 text-center text-sm text-muted-foreground">{t.dataMissing}</main>;
}

function SurahNotFound() {
  const t = useT();
  return <main className="grow p-10 text-center text-muted-foreground">{t.surahNotFound}</main>;
}

/**
 * Record verses as they scroll into the upper part of the reader; the
 * topmost visible one becomes the resume point.
 */
function useReadingTracker(
  main: React.RefObject<HTMLElement | null>,
  surahData: SurahData | undefined,
  focusMode: boolean,
) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-attach when the verse DOM swaps for focus mode
  useEffect(() => {
    const root = main.current;
    if (!root || !surahData) return;
    const surah = surahData.surah;
    const visible = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const n = Number((entry.target as HTMLElement).dataset.verse);
          if (entry.isIntersecting) {
            visible.add(n);
            recordRead(surah, n);
          } else visible.delete(n);
        }
        if (visible.size) setLastRead(surah, Math.min(...visible));
      },
      // The top 56px sits under the running head, so verses there aren't being read.
      { root, rootMargin: '-56px 0px -40% 0px' },
    );
    for (const el of root.querySelectorAll('[data-verse]')) observer.observe(el);

    // The last verses never reach the observed band (they can't scroll that
    // high), so at the bottom count everything still on screen as read.
    const onScroll = () => {
      if (root.scrollTop + root.clientHeight < root.scrollHeight - 4) return;
      const bottom = root.getBoundingClientRect().bottom;
      for (const el of root.querySelectorAll<HTMLElement>('[data-verse]')) {
        if (el.getBoundingClientRect().top < bottom) recordRead(surah, Number(el.dataset.verse));
      }
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      root.removeEventListener('scroll', onScroll);
    };
  }, [main, surahData, focusMode]);
}

function useScrollToHash(main: React.RefObject<HTMLElement | null>, surahData: SurahData | undefined) {
  useEffect(() => {
    if (!surahData) return;
    const id = location.hash.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ block: 'start' });
    else main.current?.scrollTo({ top: 0 });
  }, [main, surahData]);
}

/**
 * The running head covers the top of the reader and the dock the bottom;
 * a verse only counts as in view between them.
 */
const VIEW_INSET = { top: 56, bottom: 160 };
/**
 * Re-centring a verse that is already within a few pixels of centre would
 * only make the page twitch.
 */
const CENTER_TOLERANCE = 24;
const SCROLL_KEYS = new Set(['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown']);

/**
 * Follow the recitation like a lyrics view: keep the recited verse centred
 * until the reader scrolls themselves. Then hands off — no pulling back while
 * they read — until they have stopped scrolling for RESUME_FOLLOW_MS (each
 * scroll restarts the wait), or ask to return (the dock chip, the pill, `R`),
 * or press play/resume.
 */
function useFollowRecitation(main: React.RefObject<HTMLElement | null>, surah: number) {
  const player = usePlayer();
  const following = useRef(true);
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const active = player.surah === surah && player.verse !== null;

  const recitedVerse = useCallback(
    () => (active ? document.getElementById(`v${player.verse}`) : null),
    [active, player.verse],
  );

  const position = useCallback((): 'above' | 'in' | 'below' | null => {
    const el = recitedVerse();
    const root = main.current;
    if (!el || !root) return null;
    const box = root.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    if (rect.bottom < box.top + VIEW_INSET.top) return 'above';
    if (rect.top > box.bottom - VIEW_INSET.bottom) return 'below';
    return 'in';
  }, [main, recitedVerse]);

  /**
   * Centre the recited verse in the readable band between the running head
   * and the dock (not the raw viewport centre, which the dock overlaps). A
   * verse taller than the band starts just under the running head instead,
   * so its opening words are never cut off.
   */
  const centerVerse = useCallback(() => {
    const el = recitedVerse();
    const root = main.current;
    if (!el || !root) return;
    const box = root.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const bandTop = box.top + VIEW_INSET.top;
    const bandBottom = box.bottom - VIEW_INSET.bottom;
    const delta =
      rect.height > bandBottom - bandTop - 32
        ? rect.top - (bandTop + 16)
        : rect.top + rect.height / 2 - (bandTop + bandBottom) / 2;
    if (Math.abs(delta) > CENTER_TOLERANCE) root.scrollBy({ top: delta, behavior: 'smooth' });
  }, [main, recitedVerse]);

  /**
   * Show the chip while detached and the verse is off screen. Seeing the
   * verse again no longer re-engages follow: that is what yanked readers
   * who scrolled slowly past it.
   */
  const sync = useCallback(() => {
    const where = position();
    const detached = !following.current && (where === 'above' || where === 'below');
    const direction = where === 'above' ? 'up' : 'down';
    const prev = followStore.get();
    if (prev.detached !== detached || prev.direction !== direction) followStore.set({ ...prev, detached, direction });
  }, [position]);

  const resume = useCallback(
    (opts: { scroll: boolean }) => {
      clearTimeout(resumeTimer.current);
      following.current = true;
      followStore.set({ ...followStore.get(), detached: false, resumeAt: null });
      if (opts.scroll) centerVerse();
    },
    [centerVerse],
  );

  const returnToVerse = useCallback(() => resume({ scroll: true }), [resume]);

  // The timer fires seconds after the scroll that armed it; by then a newer
  // verse is recited, so it must call the latest `resume`, not the one that
  // was current when the reader last scrolled.
  const playingRef = useRef(player.playing);
  playingRef.current = player.playing;
  const resumeRef = useRef(resume);
  resumeRef.current = resume;

  // Only input the reader makes detaches follow; our own smooth scrolls don't.
  useEffect(() => {
    const root = main.current;
    if (!root) return;
    const detach = () => {
      following.current = false;
      clearTimeout(resumeTimer.current);
      resumeTimer.current = setTimeout(() => resumeRef.current({ scroll: playingRef.current }), RESUME_FOLLOW_MS);
      const resumeAt = Date.now() + RESUME_FOLLOW_MS;
      const prev = followStore.get();
      // Scrolling fires many events a second; refresh the countdown sparingly.
      if (prev.resumeAt === null || resumeAt - prev.resumeAt > 150) followStore.set({ ...prev, resumeAt });
    };
    const onKey = (event: KeyboardEvent) => SCROLL_KEYS.has(event.key) && detach();
    // A press on the reader itself (not its content) is the scrollbar.
    const onPointerDown = (event: PointerEvent) => event.target === root && detach();
    root.addEventListener('wheel', detach, { passive: true });
    root.addEventListener('touchmove', detach, { passive: true });
    root.addEventListener('keydown', onKey);
    root.addEventListener('pointerdown', onPointerDown);
    // Cheap: two rect reads, and the store only updates when the answer changes.
    root.addEventListener('scroll', sync, { passive: true });
    return () => {
      root.removeEventListener('wheel', detach);
      root.removeEventListener('touchmove', detach);
      root.removeEventListener('keydown', onKey);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('scroll', sync);
    };
  }, [main, sync]);

  // Pressing play or resume is a request to follow again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on the transition into playing
  useEffect(() => {
    if (player.playing) resume({ scroll: false });
  }, [player.playing]);

  // On each new verse: centre it while following (even if it is already
  // partly visible, e.g. low behind the dock), otherwise just update the chip.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs per recited verse and on play/pause
  useEffect(() => {
    if (!active) {
      followStore.set(idleFollow);
      return;
    }
    if (following.current && player.playing) centerVerse();
    sync();
  }, [active, player.verse, player.playing]);

  useEffect(() => {
    setReturnToRecitation(returnToVerse);
    return () => setReturnToRecitation(null);
  }, [returnToVerse]);

  useEffect(
    () => () => {
      clearTimeout(resumeTimer.current);
      followStore.set(idleFollow);
    },
    [],
  );

  useShortcut('returnToRecitation', returnToVerse, { scope: 'page', enabled: active });
}

function useVerseAnnotations(surah: number, signedIn: boolean) {
  const queryClient = useQueryClient();
  const notes = useQuery({ ...notesQueries.bySurah(surah), enabled: signedIn });
  const bookmarks = useQuery({ ...bookmarksQueries.list(), enabled: signedIn });
  const toggle = useMutation({
    mutationFn: useServerFn(toggleBookmarkFn),
    onSettled: () => queryClient.invalidateQueries({ queryKey: bookmarksQueries.all }),
  });

  const noteByVerse = useMemo(() => new Map(notes.data?.map((n) => [n.verse, n.body])), [notes.data]);
  const bookmarkedVerses = useMemo(
    () => new Set(bookmarks.data?.filter((b) => b.surah === surah).map((b) => b.verse)),
    [bookmarks.data, surah],
  );
  const toggleBookmark = useCallback(
    (verse: number) => toggle.mutate({ data: { surah, verse } }),
    [toggle.mutate, surah],
  );

  return { noteByVerse, bookmarkedVerses, toggleBookmark };
}

/**
 * Word popover: hover previews on devices with a mouse, tap pins it.
 */
function useWordSelection(surahData: SurahData | undefined) {
  const [selection, setSelection] = useState<WordSelection | null>(null);

  const wordAt = useCallback(
    (target: EventTarget | null): { verse: Verse; word: number; el: Element } | null => {
      if (!surahData || !(target instanceof Element)) return null;
      const el = target.closest('[data-word]');
      const verseEl = el?.closest<HTMLElement>('[data-verse]');
      if (!el || !verseEl) return null;
      const verse = surahData.verses[Number(verseEl.dataset.verse) - 1];
      return verse ? { verse, word: Number((el as HTMLElement).dataset.word), el } : null;
    },
    [surahData],
  );

  const select = useCallback((hit: { verse: Verse; word: number; el: Element }, pinned: boolean) => {
    const r = hit.el.getBoundingClientRect();
    setSelection({
      verse: hit.verse,
      word: hit.word,
      pinned,
      rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
    });
  }, []);

  const handlers = {
    onClick(event: React.MouseEvent) {
      const hit = wordAt(event.target);
      if (!hit) return setSelection(null);
      const samePinned = selection?.pinned && selection.verse === hit.verse && selection.word === hit.word;
      if (samePinned) setSelection(null);
      else select(hit, true);
    },
    onPointerOver(event: React.PointerEvent) {
      if (event.pointerType !== 'mouse' || selection?.pinned) return;
      const hit = wordAt(event.target);
      if (hit) select(hit, false);
    },
    onPointerOut(event: React.PointerEvent) {
      if (event.pointerType !== 'mouse' || !selection || selection.pinned) return;
      const into = event.relatedTarget as Element | null;
      if (into?.closest?.('[role="tooltip"]') || wordAt(into)) return;
      setSelection(null);
    },
    onScroll() {
      setSelection(null);
    },
  };

  const onPopoverLeave = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse' || selection?.pinned) return;
    if (!wordAt(event.relatedTarget)) setSelection(null);
  };

  return { selection, setSelection, handlers, onPopoverLeave };
}

function SurahPage() {
  const { surah } = Route.useParams();
  const t = useT();
  const prefs = usePrefs();
  const navigate = useNavigate();
  const player = usePlayer();
  const { data: chapters, isError: chaptersMissing } = useChapters();
  const surahData = useSurah(surah);
  const { data: session } = authClient.useSession();
  const signedIn = !!session;
  const mainRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const translation = resolveTranslation(prefs);
  const chapter = chapters?.[surah - 1];
  const prev = surah > 1 ? chapters?.[surah - 2] : undefined;
  const next = surah < 114 ? chapters?.[surah] : undefined;

  const { noteByVerse, bookmarkedVerses, toggleBookmark } = useVerseAnnotations(surah, signedIn);
  const { selection, setSelection, handlers, onPopoverLeave } = useWordSelection(surahData);

  useReadingTracker(mainRef, surahData, prefs.focusMode);
  useScrollToHash(mainRef, surahData);
  useFollowRecitation(mainRef, surah);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the popover when the surah changes
  useEffect(() => setSelection(null), [surah]);

  // Warm neighbours and this surah's recitation timings so [ ] and Play feel instant.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (surah < 114) void getSurah(surah + 1);
      if (surah > 1) void getSurah(surah - 1);
      warm(surah);
    }, 300);
    return () => clearTimeout(timer);
  }, [surah]);

  /**
   * Move verse focus by one. With no verse focused yet, start from the
   * verse being read rather than the top of the surah.
   */
  function moveVerseFocus(step: 1 | -1) {
    const verses = [...(mainRef.current?.querySelectorAll<HTMLElement>('[data-verse]') ?? [])];
    if (!verses.length) return;
    const focused = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('[data-verse]');
    const lastRead = progressStore.get().lastRead;
    const from = focused ? verses.indexOf(focused) : lastRead?.surah === surah ? lastRead.verse - 1 - step : -1;
    const target = verses[Math.min(Math.max(from + step, 0), verses.length - 1)];
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  useShortcut('nextVerse', () => moveVerseFocus(1), { scope: 'page' });
  useShortcut('prevVerse', () => moveVerseFocus(-1), { scope: 'page' });
  useShortcut('nextSurah', () => next && navigate({ to: '/surah/$surah', params: { surah: next.number } }), {
    scope: 'page',
  });
  useShortcut('prevSurah', () => prev && navigate({ to: '/surah/$surah', params: { surah: prev.number } }), {
    scope: 'page',
  });
  useShortcut('focusMode', () => setPref('focusMode', !prefs.focusMode), { scope: 'page' });
  useShortcut('latin', () => setPref('latin', !prefs.latin), { scope: 'page' });
  // Space with nothing loaded starts this surah where the reader left off.
  useShortcut('playPause', () => (player.surah !== null ? togglePause() : toggleSurahPlayback()), {
    scope: 'page',
  });

  const isThisContinuous = player.continuous && player.surah === surah;
  function toggleSurahPlayback() {
    if (isThisContinuous && !player.loading) return togglePause();
    const lastRead = progressStore.get().lastRead;
    const start =
      player.surah === surah && player.verse ? player.verse : lastRead?.surah === surah ? lastRead.verse : 1;
    void play(surah, start, { continuous: true });
  }

  const playback: SurahPlayback = !isThisContinuous
    ? 'idle'
    : player.loading
      ? 'loading'
      : player.playing
        ? 'playing'
        : 'paused';
  const controls: SurahControlsProps = {
    playback,
    focusMode: prefs.focusMode,
    onTogglePlay: toggleSurahPlayback,
    onToggleFocus: () => setPref('focusMode', !prefs.focusMode),
    latin: prefs.latin,
    onToggleLatin: () => setPref('latin', !prefs.latin),
  };

  const mushafPages = useMemo(() => (surahData ? groupPages(surahData) : []), [surahData]);

  if (chaptersMissing) {
    return <main className="grow p-10 text-center text-sm text-muted-foreground">{t.dataMissing}</main>;
  }

  const wordPopover = selection && prefs.wordByWord && (
    <WordPopover surah={surah} selection={selection} language={prefs.language} onPointerLeave={onPopoverLeave} />
  );

  return (
    <>
      <title>{chapter ? `${chapter.nameSimple} · ${t.appName}` : t.appName}</title>
      <main
        ref={mainRef}
        id="main-content"
        tabIndex={-1}
        {...handlers}
        className="min-w-0 grow overflow-y-auto outline-none">
        {chapter && <RunningHead chapter={chapter} headerRef={headerRef} rootRef={mainRef} controls={controls} />}
        <div className="mx-auto max-w-3xl animate-in px-4 pb-40 duration-300 fade-in sm:px-6 lg:px-10">
          <header ref={headerRef} className="pt-8 pb-10 sm:pt-10">
            {chapter ? (
              <>
                <h1 className="sr-only">
                  {chapter.nameSimple}, {chapterTranslatedName(chapter, prefs.language)}
                </h1>
                <Headpiece
                  key={surah}
                  surah={surah}
                  title={chapter.nameArabic}
                  subtitle={`${chapter.nameSimple} — ${chapterTranslatedName(chapter, prefs.language)}`}
                />
                {!prefs.focusMode && (
                  <dl className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    <div className="flex gap-1.5">
                      <dt className="sr-only">{t.verses(chapter.versesCount)}</dt>
                      <dd>{t.verses(chapter.versesCount)}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="sr-only">{t.revealed}</dt>
                      <dd>{chapter.revelationPlace === 'makkah' ? t.makkah : t.madinah}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt>{t.revelationOrder}</dt>
                      <dd className="text-foreground tabular-nums">{chapter.revelationOrder}</dd>
                    </div>
                    {surahData && (
                      <div className="flex gap-1.5">
                        <dt>{t.juz}</dt>
                        <dd className="text-foreground tabular-nums">{juzRange(surahData)}</dd>
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      <dt>{t.pages}</dt>
                      <dd className="text-foreground tabular-nums">
                        {chapter.pages[0] === chapter.pages[1]
                          ? chapter.pages[0]
                          : `${chapter.pages[0]}-${chapter.pages[1]}`}
                      </dd>
                    </div>
                  </dl>
                )}
                <SurahControls {...controls} />
              </>
            ) : (
              <div className="aspect-1000/240 w-full animate-pulse rounded-2xl bg-muted" />
            )}
          </header>

          {chapter?.bismillahPre && (
            <div className="pb-6">
              <div className="flex items-center justify-center gap-4">
                <Diamond />
                <p
                  dir="rtl"
                  lang="ar"
                  className="text-center font-arabic text-3xl leading-[1.9] text-gold-ink select-none sm:text-4xl">
                  {BISMILLAH}
                </p>
                <Diamond />
              </div>
              {prefs.latin && !prefs.focusMode && (
                <p lang="ar-Latn" className="mt-1 text-center font-serif text-sm text-gold-ink italic">
                  {BISMILLAH_LATIN[prefs.latinStyle]}
                </p>
              )}
            </div>
          )}

          {!surahData ? (
            <VerseSkeleton />
          ) : prefs.focusMode && chapter ? (
            <div className="-mx-2 flex flex-col gap-7 py-4 sm:mx-0">
              {mushafPages.map((page) => (
                <MushafSheet
                  key={page.page}
                  page={page}
                  chapter={chapter}
                  recitation={
                    player.surah === surah ? { verse: player.verse, word: player.word } : { verse: null, word: null }
                  }
                />
              ))}
            </div>
          ) : (
            <div className="animate-in fade-in">
              {surahData.verses.map((verse, i) => (
                <Fragment key={verse.key}>
                  {i > 0 && <VerseSeparator verse={verse} previous={surahData.verses[i - 1]} />}
                  <VerseCard
                    surah={surah}
                    verse={verse}
                    translation={translation}
                    latin={resolveLatin(prefs, verse)}
                    recitation={recitationFor(player, surah, verse.n)}
                    selectedWords={
                      selection?.verse === verse && selection.pinned
                        ? { from: selection.word, to: selection.word }
                        : null
                    }
                    bookmarked={bookmarkedVerses.has(verse.n)}
                    note={noteByVerse.get(verse.n) ?? null}
                    signedIn={signedIn}
                    onToggleBookmark={toggleBookmark}
                  />
                </Fragment>
              ))}
            </div>
          )}

          {chapter && surahData && <SurahEnd surah={surah} name={chapter.nameSimple} />}

          <nav className="mt-16 grid grid-cols-2 gap-3" aria-label="Surah navigation">
            {prev ? (
              <Link
                to="/surah/$surah"
                params={{ surah: prev.number }}
                className="group flex items-center gap-3 rounded-2xl border px-4 py-4 transition-colors hover:border-gold/60">
                <ChevronLeft className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
                <span className="min-w-0">
                  <span className="block text-xs text-muted-foreground">{t.previous}</span>
                  <span className="block truncate font-serif">{prev.nameSimple}</span>
                </span>
                <span dir="rtl" lang="ar" className="ml-auto hidden font-kufi text-xl text-gold-ink sm:block">
                  {prev.nameArabic}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                to="/surah/$surah"
                params={{ surah: next.number }}
                className="group flex items-center gap-3 rounded-2xl border px-4 py-4 text-right transition-colors hover:border-gold/60">
                <span dir="rtl" lang="ar" className="mr-auto hidden font-kufi text-xl text-gold-ink sm:block">
                  {next.nameArabic}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-muted-foreground">{t.next}</span>
                  <span className="block truncate font-serif">{next.nameSimple}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </nav>
        </div>
      </main>

      {wordPopover}
    </>
  );
}

function recitationFor(
  player: ReturnType<typeof usePlayer>,
  surah: number,
  verse: number,
): VerseCardProps['recitation'] {
  if (player.surah !== surah || player.verse !== verse) return null;
  return { word: player.word, playing: player.playing, loading: player.loading, single: !player.continuous };
}

function juzRange(surahData: SurahData): string {
  const from = surahData.verses[0]?.juz;
  const to = surahData.verses.at(-1)?.juz;
  return from === to ? `${from}` : `${from}–${to}`;
}

/**
 * Between two verses: a juz' cartouche where a new juz' begins, a divider
 * carrying the page number where a new mushaf page begins, else a plain one.
 */
function VerseSeparator({ verse, previous }: { verse: Verse; previous: Verse }) {
  if (verse.juz !== previous.juz) return <JuzMarker juz={verse.juz} />;
  return <VerseDivider page={verse.page !== previous.page ? verse.page : undefined} />;
}

function Diamond() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-3 shrink-0 text-gold">
      <path d="M10 0 L20 10 L10 20 L0 10 Z M10 5 L15 10 L10 15 L5 10 Z" fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

function VerseSkeleton() {
  return (
    <div aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
        <div key={i} className="animate-pulse border-b py-6">
          <div className="h-10 rounded-lg bg-muted" />
          <div className="mt-4 h-4 w-4/5 rounded bg-muted" />
          <div className="mt-2 h-4 w-3/5 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
