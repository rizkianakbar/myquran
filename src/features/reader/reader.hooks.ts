import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePlayer } from '#/features/audio/audio.hooks.ts';
import { play, togglePause, warm } from '#/features/audio/audio.lib.ts';
import { atPageEnd } from '#/lib/page-scroll.ts';
import { type ArabicFont, setPref, usePrefs } from '#/lib/prefs.ts';
import { progressStore, recordRead, setLastRead } from '#/lib/progress.ts';
import { getSurah } from '#/lib/quran/data.ts';
import type { Chapter, SurahData, Verse } from '#/lib/quran/types.ts';
import { useShortcut } from '#/lib/shortcuts.ts';
import { bookmarksQueries, toggleBookmarkFn } from '#/server/bookmarks.functions.ts';
import { notesQueries } from '#/server/notes.functions.ts';
import type { SurahControlsProps, SurahPlayback } from './reader-controls.tsx';
import { loadReaderFonts, readerFontsReady } from './reader-fonts.lib.ts';
import type { WordSelection } from './reader-word-popover.tsx';

/**
 * True once the reader's fonts have loaded; synchronously true on later pages.
 */
export function useReaderFontsReady(font: ArabicFont): boolean {
  const [loaded, setLoaded] = useState(() => readerFontsReady(font));

  useEffect(() => {
    let cancelled = false;
    void loadReaderFonts(font).then(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [font]);

  return loaded || readerFontsReady(font);
}

/**
 * Record verses as they scroll into the upper part of the reader; the
 * topmost visible one becomes the resume point.
 */
export function useReadingTracker(
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
      { rootMargin: '-56px 0px -40% 0px' },
    );
    for (const el of root.querySelectorAll('[data-verse]')) observer.observe(el);

    // The last verses never reach the observed band (they can't scroll that
    // high), so at the bottom count everything still on screen as read.
    const onScroll = () => {
      if (!atPageEnd()) return;
      const bottom = window.innerHeight;
      for (const el of root.querySelectorAll<HTMLElement>('[data-verse]')) {
        if (el.getBoundingClientRect().top < bottom) recordRead(surah, Number(el.dataset.verse));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [main, surahData, focusMode]);
}

/**
 * Warm the neighbouring surahs and this surah's recitation timings, so next,
 * previous and Play all start from memory. Debounced, so skipping quickly
 * through surahs doesn't fetch each one.
 */
export function useWarmSurah(surah: number) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (surah < 114) void getSurah(surah + 1).catch(() => {});
      if (surah > 1) void getSurah(surah - 1).catch(() => {});
      warm(surah);
    }, 250);
    return () => clearTimeout(timer);
  }, [surah]);
}

/**
 * The signed-in reader's notes and bookmarks for this surah.
 */
export function useVerseAnnotations(surah: number, signedIn: boolean) {
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

interface WordHit {
  verse: Verse;
  word: number;
  el: Element;
}

/**
 * Word popover: hover previews on devices with a mouse, tap pins it.
 */
export function useWordSelection(surahData: SurahData | undefined) {
  const [selection, setSelection] = useState<WordSelection | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new surah drops the popover
  useEffect(() => setSelection(null), [surahData?.surah]);

  const wordAt = useCallback(
    (target: EventTarget | null): WordHit | null => {
      if (!surahData || !(target instanceof Element)) return null;
      const el = target.closest('[data-word]');
      const verseEl = el?.closest<HTMLElement>('[data-verse]');
      if (!el || !verseEl) return null;
      const verse = surahData.verses[Number(verseEl.dataset.verse) - 1];
      return verse ? { verse, word: Number((el as HTMLElement).dataset.word), el } : null;
    },
    [surahData],
  );

  const select = useCallback((hit: WordHit, pinned: boolean) => {
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

  return { selection, handlers, onPopoverLeave };
}

/**
 * The surah-wide play button: continuous recitation from where the reader
 * left off, or pause/resume when this surah is already playing.
 */
export function useSurahPlayback(surah: number) {
  const player = usePlayer();
  const prefs = usePrefs();
  const isThisSurah = player.continuous && player.surah === surah;

  function togglePlayback() {
    if (isThisSurah && !player.loading) return togglePause();
    const lastRead = progressStore.get().lastRead;
    const start =
      player.surah === surah && player.verse ? player.verse : lastRead?.surah === surah ? lastRead.verse : 1;
    void play(surah, start, { continuous: true });
  }

  const playback: SurahPlayback = !isThisSurah
    ? 'idle'
    : player.loading
      ? 'loading'
      : player.playing
        ? 'playing'
        : 'paused';

  const controls: SurahControlsProps = {
    playback,
    focusMode: prefs.focusMode,
    onTogglePlay: togglePlayback,
    onToggleFocus: () => setPref('focusMode', !prefs.focusMode),
    latin: prefs.latin,
    onToggleLatin: () => setPref('latin', !prefs.latin),
  };

  return { controls, togglePlayback };
}

/**
 * Move verse focus by one. With no verse focused yet, start from the verse
 * being read rather than the top of the surah.
 */
function moveVerseFocus(root: HTMLElement | null, surah: number, step: 1 | -1) {
  const verses = [...(root?.querySelectorAll<HTMLElement>('[data-verse]') ?? [])];
  if (!verses.length) return;
  const focused = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('[data-verse]');
  const lastRead = progressStore.get().lastRead;
  const from = focused ? verses.indexOf(focused) : lastRead?.surah === surah ? lastRead.verse - 1 - step : -1;
  const target = verses[Math.min(Math.max(from + step, 0), verses.length - 1)];
  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

interface ReaderShortcutsOptions {
  main: React.RefObject<HTMLElement | null>;
  surah: number;
  prev: Chapter | undefined;
  next: Chapter | undefined;
  togglePlayback: () => void;
}

/**
 * The reader's page-scoped keys: verse and surah navigation, view toggles,
 * and Space starting this surah when nothing is loaded yet.
 */
export function useReaderShortcuts({ main, surah, prev, next, togglePlayback }: ReaderShortcutsOptions) {
  const navigate = useNavigate();
  const prefs = usePrefs();
  const player = usePlayer();
  const toSurah = (chapter: Chapter | undefined) =>
    chapter && navigate({ to: '/surah/$surah', params: { surah: chapter.number } });

  useShortcut('nextVerse', () => moveVerseFocus(main.current, surah, 1), { scope: 'page' });
  useShortcut('prevVerse', () => moveVerseFocus(main.current, surah, -1), { scope: 'page' });
  useShortcut('nextSurah', () => toSurah(next), { scope: 'page' });
  useShortcut('prevSurah', () => toSurah(prev), { scope: 'page' });
  useShortcut('focusMode', () => setPref('focusMode', !prefs.focusMode), { scope: 'page' });
  useShortcut('latin', () => setPref('latin', !prefs.latin), { scope: 'page' });
  useShortcut('playPause', () => (player.surah !== null ? togglePause() : togglePlayback()), { scope: 'page' });
}
