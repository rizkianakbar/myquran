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
 * Travel the reader's own scroll must cover before the bars react. Hiding
 * waits for a deliberate scroll down; showing reacts to the slightest pull up.
 */
const HIDE_AFTER_PX = 24;
const SHOW_AFTER_PX = 6;

/**
 * Near the top the headpiece is in view; leave the bars alone there.
 */
const TOP_ZONE_PX = 80;

/**
 * A gesture's momentum has ended once the page stops scrolling this long.
 */
const SETTLE_MS = 150;

const KEY_DIRECTION: Record<string, 1 | -1> = {
  ArrowDown: 1,
  PageDown: 1,
  End: 1,
  ' ': 1,
  ArrowUp: -1,
  PageUp: -1,
  Home: -1,
};

/**
 * Phones: hide the bars while the reader scrolls down, and bring them back on
 * any pull up, near the top, or at the end of the page.
 *
 * The reader's input (finger, wheel, keys) decides the direction; the scroll
 * offset, counted only while it moves that way, decides the distance. So a
 * fast flick counts its momentum too, while offset changes the reader didn't
 * make (cards above settling to their real height, follow-along, restoring a
 * position) leave the bars alone.
 */
export function useHideChromeOnScroll(main: React.RefObject<HTMLElement | null>) {
  const isPhone = useIsPhone();

  useEffect(() => {
    const root = main.current;
    if (!root || !isPhone) return;
    // Direction of the reader's current gesture: 1 reading on, -1 pulling back.
    let direction: 1 | -1 | 0 = 0;
    // Distance travelled in that direction since it last changed.
    let travel = 0;
    let touchY: number | null = null;
    let lastY = window.scrollY;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const atEdge = () => window.scrollY < TOP_ZONE_PX || atPageEnd();
    const steer = (next: 1 | -1) => {
      if (next !== direction) travel = 0;
      direction = next;
      clearTimeout(settleTimer);
    };
    const settleSoon = () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        if (touchY === null) direction = 0;
      }, SETTLE_MS);
    };

    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches.length === 1 ? event.touches[0].clientY : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (touchY === null || event.touches.length !== 1) return;
      const y = event.touches[0].clientY;
      // A finger moving up scrolls the page down.
      if (y !== touchY) steer(y < touchY ? 1 : -1);
      touchY = y;
    };
    const onTouchEnd = () => {
      touchY = null;
      // Keep the direction through the flick's momentum.
      settleSoon();
    };
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      steer(event.deltaY > 0 ? 1 : -1);
      settleSoon();
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable], [role="dialog"]')) return;
      const step = KEY_DIRECTION[event.key];
      if (!step) return;
      steer(event.key === ' ' && event.shiftKey ? -1 : step);
      settleSoon();
    };
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      if (atEdge()) {
        travel = 0;
        return chromeHiddenStore.set(false);
      }
      if (direction === 0 || Math.sign(delta) !== direction) return;
      travel += Math.abs(delta);
      if (direction < 0 && travel > SHOW_AFTER_PX) chromeHiddenStore.set(false);
      if (direction > 0 && travel > HIDE_AFTER_PX) chromeHiddenStore.set(true);
      if (touchY === null) settleSoon();
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
      clearTimeout(settleTimer);
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
