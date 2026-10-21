import { createStore } from './store.ts';

/**
 * Whether the dock and running head are tucked away so the reader sees only
 * the verses. Written by the reader page, read by both bars.
 */
export const chromeHiddenStore = createStore(false);
