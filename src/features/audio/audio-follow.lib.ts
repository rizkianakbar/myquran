import { createStore } from '#/lib/store.ts';

/**
 * Whether the reader has scrolled away from the verse being recited, which
 * way it lies, and when follow will resume on its own (`resumeAt`, epoch ms;
 * null while they are still scrolling or once it has resumed). Written by
 * the reader page, read by the dock's chip.
 */
export interface FollowState {
  detached: boolean;
  direction: 'up' | 'down';
  resumeAt: number | null;
}

export const idleFollow: FollowState = { detached: false, direction: 'down', resumeAt: null };

export const followStore = createStore<FollowState>(idleFollow);

/**
 * How long the reader must stop scrolling before follow resumes.
 */
export const RESUME_FOLLOW_MS = 5000;

let returner: (() => void) | null = null;

/**
 * The reader page registers how to scroll back; the dock and the `R`
 * shortcut call it without knowing anything about the page's scroll.
 */
export function setReturnToRecitation(fn: (() => void) | null) {
  returner = fn;
}

/**
 * Returns false when no reader page is mounted to handle it.
 */
export function returnToRecitation(): boolean {
  if (!returner) return false;
  returner();
  return true;
}
