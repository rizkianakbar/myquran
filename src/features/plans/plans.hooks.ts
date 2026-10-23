import { useEffect, useMemo } from 'react';
import { onIdle } from '#/lib/idle.ts';
import { dateKey } from '#/lib/progress.ts';
import { summarizePlan } from './plans.lib.ts';
import { ensurePlanToday, planStore } from './plans.store.ts';

/**
 * The plan with today's numbers. Fixes today's portion when the day has
 * turned, so it stays put while the reader works through it.
 */
export function usePlan() {
  const { plan, synced } = planStore.use();
  const today = dateKey(new Date());

  useEffect(() => {
    if (plan && !plan.completedAt && plan.today?.date !== today) ensurePlanToday();
  }, [plan, today]);

  const summary = useMemo(() => (plan ? summarizePlan(plan, today) : null), [plan, today]);
  return { plan, synced, summary, today };
}

/**
 * Start (or re-run) plan sync, e.g. right after starting a plan or signing in.
 */
export function requestPlanSync() {
  void import('./plans.sync.ts').then((sync) => sync.startPlanSync());
}

/**
 * Start plan sync once the page is idle, but only where there is something
 * to sync (a plan here, or an account signed in last time), so guests
 * without a plan never load the auth client.
 */
export function usePlanSync() {
  useEffect(
    () =>
      onIdle(
        () => {
          void import('./plans.sync.ts').then((sync) => {
            if (planStore.get().plan || sync.hasAccountHint()) void sync.startPlanSync();
          });
        },
        { timeout: 4000, fallbackDelay: 2000 },
      ),
    [],
  );
}
