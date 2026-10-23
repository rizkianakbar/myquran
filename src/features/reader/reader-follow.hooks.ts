import { useCallback, useEffect, useRef } from 'react';
import { usePlayer } from '#/features/audio/audio.hooks.ts';
import { followStore, idleFollow, RESUME_FOLLOW_MS, setReturnToRecitation } from '#/features/audio/audio-follow.lib.ts';
import { useShortcut } from '#/lib/shortcuts.ts';

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
export function useFollowRecitation(main: React.RefObject<HTMLElement | null>, surah: number) {
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
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.bottom < VIEW_INSET.top) return 'above';
    if (rect.top > window.innerHeight - VIEW_INSET.bottom) return 'below';
    return 'in';
  }, [recitedVerse]);

  /**
   * Centre the recited verse in the readable band between the running head
   * and the dock (not the raw viewport centre, which the dock overlaps). A
   * verse taller than the band starts just under the running head instead,
   * so its opening words are never cut off.
   */
  const centerVerse = useCallback(() => {
    const el = recitedVerse();
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const bandTop = VIEW_INSET.top;
    const bandBottom = window.innerHeight - VIEW_INSET.bottom;
    const delta =
      rect.height > bandBottom - bandTop - 32
        ? rect.top - (bandTop + 16)
        : rect.top + rect.height / 2 - (bandTop + bandBottom) / 2;
    if (Math.abs(delta) > CENTER_TOLERANCE) window.scrollBy({ top: delta, behavior: 'smooth' });
  }, [recitedVerse]);

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
    // A press on the document itself (not its content) is the scrollbar.
    const onPointerDown = (event: PointerEvent) => event.target === document.documentElement && detach();
    root.addEventListener('wheel', detach, { passive: true });
    root.addEventListener('touchmove', detach, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointerDown);
    // Cheap: one rect read, and the store only updates when the answer changes.
    window.addEventListener('scroll', sync, { passive: true });
    return () => {
      root.removeEventListener('wheel', detach);
      root.removeEventListener('touchmove', detach);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', sync);
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
