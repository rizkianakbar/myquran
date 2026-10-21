import { createStore } from './store.ts';

export interface LastRead {
  surah: number;
  verse: number;
}

export interface Progress {
  lastRead: LastRead | null;
  /**
   * Verse keys read per local day, e.g. `{ '2026-10-21': ['1:1', '1:2'] }`.
   */
  activity: Record<string, string[]>;
  /**
   * Highest verse reached per surah.
   */
  furthest: Record<number, number>;
}

const RETENTION_DAYS = 60;

/**
 * Writes are debounced: the reader records a verse every time one scrolls
 * into view, and synchronous JSON writes per verse cause scroll jank.
 */
export const progressStore = createStore<Progress>(
  { lastRead: null, activity: {}, furthest: {} },
  { key: 'quran:progress', persistDelayMs: 800 },
);

export function useProgress() {
  return progressStore.use();
}

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysAgo(n: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date;
}

function pruneActivity(activity: Record<string, string[]>): Record<string, string[]> {
  const cutoff = dateKey(daysAgo(RETENTION_DAYS));
  return Object.fromEntries(Object.entries(activity).filter(([day]) => day >= cutoff));
}

export function setLastRead(surah: number, verse: number) {
  const current = progressStore.get().lastRead;
  if (current?.surah === surah && current.verse === verse) return;
  progressStore.set((prev) => ({ ...prev, lastRead: { surah, verse } }));
}

export function recordRead(surah: number, verse: number) {
  const prev = progressStore.get();
  const today = dateKey(new Date());
  const key = `${surah}:${verse}`;
  const todays = prev.activity[today] ?? [];
  const isNewToday = !todays.includes(key);
  const isFurther = (prev.furthest[surah] ?? 0) < verse;
  if (!isNewToday && !isFurther) return;

  progressStore.set({
    ...prev,
    activity: isNewToday ? pruneActivity({ ...prev.activity, [today]: [...todays, key] }) : prev.activity,
    furthest: isFurther ? { ...prev.furthest, [surah]: verse } : prev.furthest,
  });
}

/**
 * Consecutive days with reading, ending today — or yesterday, so the streak
 * doesn't read as broken before the user has opened the app today.
 */
export function computeStreak(activity: Record<string, string[]>): number {
  let offset = activity[dateKey(new Date())]?.length ? 0 : 1;
  let streak = 0;
  while (activity[dateKey(daysAgo(offset))]?.length) {
    streak++;
    offset++;
  }
  return streak;
}

export function lastNDays(n: number): { key: string; date: Date }[] {
  return Array.from({ length: n }, (_, i) => {
    const date = daysAgo(n - 1 - i);
    return { key: dateKey(date), date };
  });
}
