import { useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useIsPhone } from '#/hooks/use-media-query.ts';
import { chromeHiddenStore } from '#/lib/chrome.ts';
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
    if (saved && target) {
      root.scrollTop += target.getBoundingClientRect().top - saved.top;
      release = holdInPlace(root, saved.id, saved.top);
    } else if (hash && target) {
      target.scrollIntoView({ block: 'start' });
      release = holdInPlace(root, hash, target.getBoundingClientRect().top);
    } else root.scrollTop = 0;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const position = topVerse(root);
        savedPositions.delete(key);
        if (position) savedPositions.set(key, position);
      }, SAVE_DELAY_MS);
    };
    root.addEventListener('scroll', save, { passive: true });
    return () => {
      release?.();
      clearTimeout(timer);
      root.removeEventListener('scroll', save);
    };
  }, [main, surahData, key, hash]);
}

/**
 * Down-scroll distance before the bars hide, so a small nudge doesn't.
 */
const HIDE_AFTER_PX = 24;

/**
 * Near the top the headpiece is in view; leave the bars alone there.
 */
const TOP_ZONE_PX = 80;

/**
 * How long after the last touch or wheel a scroll still counts as the
 * reader's (it covers momentum). Scrolls outside it are programmatic, like
 * follow-along during recitation, and leave the bars as they are.
 */
const USER_SCROLL_MS = 1200;

const USER_INPUTS = ['touchstart', 'touchmove', 'touchend', 'wheel'] as const;

/**
 * Phones: hide the bars while the reader scrolls down, and bring them back on
 * any scroll up, at the top, or at the end of the page.
 */
export function useHideChromeOnScroll(main: React.RefObject<HTMLElement | null>) {
  const isPhone = useIsPhone();

  useEffect(() => {
    const root = main.current;
    if (!root || !isPhone) return;
    let last = root.scrollTop;
    let down = 0;
    let userUntil = 0;

    const markUser = () => {
      userUntil = performance.now() + USER_SCROLL_MS;
    };
    const onScroll = () => {
      const top = root.scrollTop;
      const delta = top - last;
      last = top;
      const atEdge = top < TOP_ZONE_PX || top + root.clientHeight >= root.scrollHeight - 4;
      if (atEdge) {
        down = 0;
        return chromeHiddenStore.set(false);
      }
      if (performance.now() > userUntil) return;
      if (delta < 0) {
        down = 0;
        chromeHiddenStore.set(false);
      } else {
        down += delta;
        if (down > HIDE_AFTER_PX) chromeHiddenStore.set(true);
      }
    };

    root.addEventListener('scroll', onScroll, { passive: true });
    for (const type of USER_INPUTS) root.addEventListener(type, markUser, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      for (const type of USER_INPUTS) root.removeEventListener(type, markUser);
      chromeHiddenStore.set(false);
    };
  }, [main, isPhone]);
}
