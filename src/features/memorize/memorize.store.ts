import { dateKey } from '#/lib/progress.ts';
import { createStore } from '#/lib/store.ts';
import { memorizedPassage, passageId, reviewedPassage, sameRange } from './memorize.lib.ts';
import type { Learning, MemorizeSettings, Passage, PracticeRange } from './memorize.types.ts';

/**
 * Hifz on this device: settings, the passage being learned, and memorized
 * passages with their review schedule. Local for now, like progress; it is
 * small and plain, so it can sync to the account later as plans do.
 */
export const memorizeStore = createStore<{
  settings: MemorizeSettings;
  learning: Learning | null;
  passages: Passage[];
}>(
  { settings: { listenRepeats: 1, firstWordHint: true, showMeaning: false, quiz: true }, learning: null, passages: [] },
  { key: 'quran:hifz' },
);

export function setMemorizeSetting<K extends keyof MemorizeSettings>(key: K, value: MemorizeSettings[K]) {
  memorizeStore.set((prev) => ({ ...prev, settings: { ...prev.settings, [key]: value } }));
}

/**
 * Note a verse as learned in the passage being learned (starting it if new).
 */
export function markVerseLearned(range: PracticeRange, verse: number) {
  memorizeStore.set((prev) => {
    const learned = sameRange(prev.learning?.range, range) ? (prev.learning?.learned ?? []) : [];
    return { ...prev, learning: { range, learned: learned.includes(verse) ? learned : [...learned, verse] } };
  });
}

/**
 * The passage is memorized: it joins the review schedule (replacing an
 * older copy of the same passage) and stops being "in progress".
 */
export function completePassage(range: PracticeRange) {
  memorizeStore.set((prev) => ({
    ...prev,
    learning: sameRange(prev.learning?.range, range) ? null : prev.learning,
    passages: [
      ...prev.passages.filter((p) => passageId(p) !== passageId(range)),
      memorizedPassage(range, dateKey(new Date())),
    ],
  }));
}

export function recordReview(range: PracticeRange, solid: boolean) {
  const today = dateKey(new Date());
  memorizeStore.set((prev) => ({
    ...prev,
    passages: prev.passages.map((p) => (passageId(p) === passageId(range) ? reviewedPassage(p, solid, today) : p)),
  }));
}

export function findPassage(passages: Passage[], range: PracticeRange): Passage | undefined {
  return passages.find((p) => sameRange(p, range));
}
