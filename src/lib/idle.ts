/**
 * Run `fn` when the browser is idle (within `timeout` ms at the latest).
 * Safari has no requestIdleCallback; there it runs after `fallbackDelay`.
 * Returns a cancel function.
 */
export function onIdle(fn: () => void, { timeout = 1000, fallbackDelay = 150 } = {}): () => void {
  if (typeof requestIdleCallback === 'undefined') {
    const timer = setTimeout(fn, fallbackDelay);
    return () => clearTimeout(timer);
  }
  const id = requestIdleCallback(fn, { timeout });
  return () => cancelIdleCallback(id);
}
