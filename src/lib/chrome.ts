import { useEffect } from 'react';
import { createStore } from './store.ts';
import { useIsPhone } from './use-media-query.ts';

/**
 * Whether the dock and running head are tucked away so the reader sees only
 * the verses. Written by the reader page, read by both bars.
 */
export const chromeHiddenStore = createStore(false);

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

/**
 * Phones: hide the bars while the reader scrolls down, and bring them back on
 * any scroll up, at the top, or at the end of the page.
 */
export function useHideChromeOnScroll(rootRef: React.RefObject<HTMLElement | null>) {
  const isPhone = useIsPhone();

  useEffect(() => {
    const root = rootRef.current;
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
    root.addEventListener('touchstart', markUser, { passive: true });
    root.addEventListener('touchmove', markUser, { passive: true });
    root.addEventListener('touchend', markUser, { passive: true });
    root.addEventListener('wheel', markUser, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      root.removeEventListener('touchstart', markUser);
      root.removeEventListener('touchmove', markUser);
      root.removeEventListener('touchend', markUser);
      root.removeEventListener('wheel', markUser);
      chromeHiddenStore.set(false);
    };
  }, [rootRef, isPhone]);
}
