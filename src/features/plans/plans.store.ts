import { dateKey } from '#/lib/progress.ts';
import { createStore } from '#/lib/store.ts';
import { createPlan, withToday, withVerseRead } from './plans.lib.ts';
import type { PlanState } from './plans.types.ts';

/**
 * The reading plan on this device. Signed in, `plans.sync.ts` keeps it in
 * step with the account. Debounced like progress: the reader marks a verse
 * every time one scrolls into view.
 */
export const planStore = createStore<PlanState>(
  { plan: null, synced: false },
  { key: 'quran:plan', persistDelayMs: 800 },
);

/**
 * Whether this device is signed in, once `plans.sync.ts` has asked; null
 * until then, so a "sign in to sync" hint doesn't flash for signed-in readers.
 */
export const accountStore = createStore<{ signedIn: boolean | null }>({ signedIn: null });

export function startPlan(endDate: string) {
  const today = dateKey(new Date());
  // Not synced yet; on push it replaces any older plan on the account.
  planStore.set({ plan: withToday(createPlan(today, endDate), today), synced: false });
}

/**
 * Move the finish date; today's portion is worked out again for the new pace.
 */
export function setPlanEndDate(endDate: string) {
  const today = dateKey(new Date());
  planStore.set((prev) =>
    prev.plan ? { ...prev, plan: withToday({ ...prev.plan, endDate, today: null }, today) } : prev,
  );
}

export function endPlan() {
  planStore.set({ plan: null, synced: false });
}

/**
 * Fix today's portion if the day has turned since it was last worked out.
 */
export function ensurePlanToday() {
  const today = dateKey(new Date());
  planStore.set((prev) => (prev.plan ? { ...prev, plan: withToday(prev.plan, today) } : prev));
}

/**
 * Count a verse the reader has read towards the plan. Today's portion is
 * fixed first, so it reflects where the day started, not where it got to.
 */
export function markPlanRead(surah: number, verse: number) {
  const { plan } = planStore.get();
  if (!plan || plan.completedAt) return;
  const next = withVerseRead(withToday(plan, dateKey(new Date())), surah, verse);
  if (next !== plan) planStore.set((prev) => ({ ...prev, plan: next }));
}
