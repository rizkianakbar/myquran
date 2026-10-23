import { dateKey } from '#/lib/progress.ts';
import { createStore } from '#/lib/store.ts';

/**
 * What has been said today: each dua's count (1 for one said once). On this
 * device only; a new day starts the adhkar fresh, with nothing carried over.
 */
const saidStore = createStore<{ day: string; counts: Record<string, number> }>(
  { day: '', counts: {} },
  { key: 'quran:duas-said' },
);

function today(state: { day: string; counts: Record<string, number> }) {
  return state.day === dateKey(new Date()) ? state.counts : {};
}

/**
 * Today's counts, empty once the day has turned.
 */
export function useSaidToday(): Record<string, number> {
  return today(saidStore.use());
}

export function setSaid(id: string, count: number) {
  saidStore.set((prev) => {
    const counts = { ...today(prev) };
    if (count > 0) counts[id] = count;
    else delete counts[id];
    return { day: dateKey(new Date()), counts };
  });
}
