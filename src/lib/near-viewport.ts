import { startTransition, useEffect, useState } from 'react';

/**
 * How far ahead of the screen an element counts as near: two screens above
 * and below, so a card is ready well before a slow scroll reaches it.
 */
const LOOKAHEAD = '200% 0px 200% 0px';

/**
 * Changes wait until scrolling has paused this long. Mid-flick, the far form
 * of a card looks the same, and swapping cards then would cost frames.
 */
const SETTLE_MS = 150;

type Callback = (near: boolean) => void;

interface Watcher {
  observer: IntersectionObserver;
  pending: Map<Element, boolean>;
}

const callbacks = new WeakMap<Element, Callback>();
const watchers = new WeakMap<Element | Document, Watcher>();

function flush(pending: Map<Element, boolean>) {
  if (pending.size === 0) return;
  const batch = [...pending];
  pending.clear();
  startTransition(() => {
    for (const [node, near] of batch) callbacks.get(node)?.(near);
  });
}

/**
 * One observer per scroll container. rootMargin only grows the root's own
 * box, so lookahead inside a scrolling <main> needs that <main> as the root.
 */
function watcherFor(node: Element): Watcher {
  const root = node.closest('#main-content') ?? document;
  let watcher = watchers.get(root);
  if (watcher) return watcher;

  const pending = new Map<Element, boolean>();
  let scrolling = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  root.addEventListener(
    'scroll',
    () => {
      scrolling = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        scrolling = false;
        flush(pending);
      }, SETTLE_MS);
    },
    { passive: true },
  );
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) pending.set(entry.target, entry.isIntersecting);
      if (!scrolling) flush(pending);
    },
    { root: root === document ? null : root, rootMargin: LOOKAHEAD },
  );
  watcher = { observer, pending };
  watchers.set(root, watcher);
  return watcher;
}

/**
 * Whether `ref`'s element is within a couple of screens of the viewport,
 * updated once scrolling settles.
 */
export function useNearViewport(ref: React.RefObject<Element | null>): boolean {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const { observer, pending } = watcherFor(node);
    callbacks.set(node, setNear);
    observer.observe(node);
    return () => {
      observer.unobserve(node);
      callbacks.delete(node);
      pending.delete(node);
    };
  }, [ref]);

  return near;
}
