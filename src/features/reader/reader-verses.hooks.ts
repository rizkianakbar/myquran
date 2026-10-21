import { startTransition, useEffect, useState } from 'react';

/**
 * How far ahead of the screen a verse counts as near: two screens above and
 * below, so a card is ready well before a slow scroll reaches it.
 */
const LOOKAHEAD = '200% 0px 200% 0px';

/**
 * Changes wait until scrolling has paused this long. Mid-flick, the far form
 * of a card looks the same, and swapping cards then would cost frames.
 */
const SETTLE_MS = 150;

const NONE: ReadonlySet<number> = new Set();

function applyBatch(prev: ReadonlySet<number>, batch: [number, boolean][]): ReadonlySet<number> {
  const next = new Set(prev);
  for (const [verse, near] of batch) {
    if (near) next.add(verse);
    else next.delete(verse);
  }
  return next;
}

/**
 * Which verses in `list` are within a couple of screens of the viewport.
 * One state update per settled scroll, as a transition, so mounting the
 * cards ahead never holds up a frame.
 */
export function useNearVerses(list: React.RefObject<HTMLElement | null>, active: boolean): ReadonlySet<number> {
  const [near, setNear] = useState(NONE);

  useEffect(() => {
    const container = list.current;
    if (!container || !active) return;
    // rootMargin only grows the root's own box, so lookahead inside the
    // scrolling <main> needs that <main> as the root.
    const root = container.closest<HTMLElement>('#main-content');
    const pending = new Map<number, boolean>();
    let scrolling = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      if (pending.size === 0) return;
      const batch = [...pending];
      pending.clear();
      startTransition(() => setNear((prev) => applyBatch(prev, batch)));
    };
    const onScroll = () => {
      scrolling = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        scrolling = false;
        flush();
      }, SETTLE_MS);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          pending.set(Number((entry.target as HTMLElement).dataset.verse), entry.isIntersecting);
        }
        if (!scrolling) flush();
      },
      { root, rootMargin: LOOKAHEAD },
    );

    for (const card of container.querySelectorAll('article[data-verse]')) observer.observe(card);
    root?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      clearTimeout(timer);
      root?.removeEventListener('scroll', onScroll);
    };
  }, [list, active]);

  return near;
}
