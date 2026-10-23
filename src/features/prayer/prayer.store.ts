import { createStore } from '#/lib/store.ts';
import type { ReminderState } from './prayer.lib.ts';
import type { PrayerSettings } from './prayer.types.ts';

/**
 * Where and how prayer times are worked out. Kept on this device only: a
 * location is personal, and it is only ever used here, in the browser.
 */
export const prayerStore = createStore<PrayerSettings>(
  { place: null, method: 'auto', madhab: 'shafi', reminders: true },
  { key: 'quran:prayer' },
);

/**
 * Answers to the prayer reminder (see `ReminderState`), on this device.
 */
export const reminderStore = createStore<ReminderState>(
  { answered: [], snooze: null },
  { key: 'quran:prayer-answers' },
);

/**
 * Enough to cover the prayers that could still be asked about.
 */
const KEEP_ANSWERS = 10;

export function markPrayed(id: string) {
  reminderStore.set((prev) => ({
    answered: [...prev.answered.filter((a) => a !== id), id].slice(-KEEP_ANSWERS),
    snooze: null,
  }));
}

export function snoozeReminder(id: string, minutes: number) {
  reminderStore.set((prev) => ({ ...prev, snooze: { id, until: Date.now() + minutes * 60_000 } }));
}

export function setPrayerSetting<K extends keyof PrayerSettings>(key: K, value: PrayerSettings[K]) {
  prayerStore.set((prev) => ({ ...prev, [key]: value }));
}
