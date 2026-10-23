import { createStore } from '#/lib/store.ts';
import type { PrayerSettings } from './prayer.types.ts';

/**
 * Where and how prayer times are worked out. Kept on this device only: a
 * location is personal, and it is only ever used here, in the browser.
 */
export const prayerStore = createStore<PrayerSettings>(
  { place: null, method: 'auto', madhab: 'shafi' },
  { key: 'quran:prayer' },
);

export function setPrayerSetting<K extends keyof PrayerSettings>(key: K, value: PrayerSettings[K]) {
  prayerStore.set((prev) => ({ ...prev, [key]: value }));
}
