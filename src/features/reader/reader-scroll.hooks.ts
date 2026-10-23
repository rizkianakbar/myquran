import { useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useIsPhone } from '#/hooks/use-media-query.ts';
import { chromeHiddenStore } from '#/lib/chrome.ts';
import { atPageEnd, pageScroller } from '#/lib/page-scroll.ts';
import type { SurahData } from '#/lib/quran/types.ts';
import { holdInPlace, savedPositions, topVerse } from './reader-scroll.lib.ts';

/**
 * Finding the top verse measures elements; doing that on every frame of a
 * fast flick costs frames, so the position is saved once scrolling pauses.
 */
const SAVE_DELAY_MS = 150;

/**
 * The reader owns its scroll (the router's restoration is off for this
 * route): back/forward and reloads return to the saved verse, a `#v12` link
 * goes to that verse, and anything else starts at the top.
 */
export function useScrollPosition(main: React.RefObject<HTMLElement | null>, surahData: SurahData | undefined) {
  const { key, hash } = useLocation({ select: (l) => ({ key: l.state.__TSR_key ?? l.href, hash: l.hash }) });

  useEffect(() => {
    const root = main.current;
    if (!root || !surahData) return;
    const saved = savedPositions.get(key);
    const target = document.getElementById(saved?.id ?? hash);
    let release: (() => void) | undefined;
    const page = pageScroller();
    if (saved && target) {
      page.scrollTop += target.getBoundingClientRect().top - saved.top;
      release = holdInPlace(root, saved.id, saved.top);
    } else if (hash && target) {
      target.scrollIntoView({ block: 'start' });
      release = holdInPlace(root, hash, target.getBoundingClientRect().top);
    } else page.scrollTop = 0;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const position = topVerse(root);
        savedPositions.delete(key);
        if (position) savedPositions.set(key, position);
      }, SAVE_DELAY_MS);
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      release?.();
      clearTimeout(timer);
      window.removeEventListener('scroll', save);
    };
  }, [main, surahData, key, hash]);
}

/**
 * Travel the reader's own gesture must cover before the bars react. Hiding
 * waits for a deliberate scroll down; showing reacts to the slightest pull up.
 */
const HIDE_AFTER_PX = 24;
const SHOW_AFTER_PX = 6;

/**
 * Near the top the headpiece is in view; leave the bars alone there.
 */
const TOP_ZONE_PX = 80;

const KEY_STEP: Record<string, number> = {
  ArrowDown: 40,
  ArrowUp: -40,
  PageDown: 400,
  PageUp: -400,
  ' ': 400,
  End: 400,
  Home: -400,
};

/**
 * Phones: hide the bars while the reader scrolls down, and bring them back on
 * any pull up, near the top, or at the end of the page.
 *
 * Direction comes from the reader's input (finger, wheel, keys), not from
 * scroll offsets: the offset also moves when cards above the screen settle to
 * their real height, during follow-along, and through iOS momentum, and
 * reading those as gestures made the bars flicker or refuse to come back.
 */
export function useHideChromeOnScroll(main: React.RefObject<HTMLElement | null>) {
  const isPhone = useIsPhone();

  useEffect(() => {
    const root = main.current;
    if (!root || !isPhone) return;
    // Signed distance in the current direction: + reading on, - pulling back.
    let travel = 0;
    let touchY: number | null = null;

    const atEdge = () => window.scrollY < TOP_ZONE_PX || atPageEnd();
    const move = (dy: number) => {
      if (dy === 0) return;
      if (Math.sign(dy) !== Math.sign(travel)) travel = 0;
      travel += dy;
      if (travel < -SHOW_AFTER_PX) chromeHiddenStore.set(false);
      else if (travel > HIDE_AFTER_PX && !atEdge()) chromeHiddenStore.set(true);
    };

    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches.length === 1 ? event.touches[0].clientY : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (touchY === null || event.touches.length !== 1) return;
      const y = event.touches[0].clientY;
      // A finger moving up scrolls the page down.
      move(touchY - y);
      touchY = y;
    };
    const onTouchEnd = () => {
      touchY = null;
    };
    const onWheel = (event: WheelEvent) => move(event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY);
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable], [role="dialog"]')) return;
      const step = KEY_STEP[event.key];
      if (step) move(event.key === ' ' && event.shiftKey ? -step : step);
    };
    // Offsets are only trusted for the edges, where the bars always return.
    const onScroll = () => {
      if (atEdge()) {
        travel = 0;
        chromeHiddenStore.set(false);
      }
    };

    // Touch and wheel on the reader only: scrolling a sheet must not hide the dock.
    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('touchmove', onTouchMove, { passive: true });
    root.addEventListener('touchend', onTouchEnd, { passive: true });
    root.addEventListener('touchcancel', onTouchEnd, { passive: true });
    root.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('touchstart', onTouchStart);
      root.removeEventListener('touchmove', onTouchMove);
      root.removeEventListener('touchend', onTouchEnd);
      root.removeEventListener('touchcancel', onTouchEnd);
      root.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
      chromeHiddenStore.set(false);
    };
  }, [main, isPhone]);
}
