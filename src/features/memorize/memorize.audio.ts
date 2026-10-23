import { onVerseEnd, play, playerStore, stop, togglePause } from '#/features/audio/audio.lib.ts';
import { createStore } from '#/lib/store.ts';
import type { PracticeRange } from './memorize.types.ts';

/**
 * Recitation for memorizing, on top of the shared player: one verse a set
 * number of times (Listen), or a whole passage once, stopping at its end
 * (the shared player only knows "one verse" and "to the end of the surah").
 */
interface Listening {
  mode: 'idle' | 'verse' | 'passage';
  surah: number | null;
  verse: number | null;
  /**
   * Times the verse has played through, of `total`.
   */
  plays: number;
  total: number;
  /**
   * In the breath between two repeats: playing as far as the reader can
   * tell, though the player itself is paused.
   */
  between: boolean;
}

const idle: Listening = { mode: 'idle', surah: null, verse: null, plays: 0, total: 0, between: false };

export const listeningStore = createStore<Listening>(idle);

/**
 * A breath between repeats of a verse.
 */
const REPEAT_GAP_MS = 700;

let repeatTimer: ReturnType<typeof setTimeout> | undefined;
let stopWatch: (() => void) | null = null;

onVerseEnd((surah, verse) => {
  const state = listeningStore.get();
  if (state.mode !== 'verse' || state.surah !== surah || state.verse !== verse) return;
  const plays = state.plays + 1;
  if (plays >= state.total) return listeningStore.set({ ...state, mode: 'idle', plays });
  listeningStore.set({ ...state, plays, between: true });
  repeatTimer = setTimeout(() => {
    listeningStore.set((prev) => ({ ...prev, between: false }));
    void play(surah, verse);
  }, REPEAT_GAP_MS);
});

function reset() {
  clearTimeout(repeatTimer);
  stopWatch?.();
  stopWatch = null;
}

/**
 * Play a verse `total` times, counting from `plays` (to carry on a count).
 */
export function listenToVerse(surah: number, verse: number, total: number, plays = 0) {
  reset();
  listeningStore.set({ mode: 'verse', surah, verse, plays, total, between: false });
  void play(surah, verse);
}

/**
 * Play a passage once through, stopping after its last verse.
 */
export function listenToPassage(range: PracticeRange) {
  reset();
  listeningStore.set({ mode: 'passage', surah: range.surah, verse: null, plays: 0, total: 1, between: false });
  void play(range.surah, range.from, { continuous: true });
  stopWatch = playerStore.subscribe(() => {
    const player = playerStore.get();
    if (listeningStore.get().mode !== 'passage') return;
    const pastEnd = player.surah !== range.surah || (player.verse !== null && player.verse > range.to);
    // The surah's own end stops the player (surah null); that ends the passage too.
    if (pastEnd) stopListening();
  });
}

/**
 * Pause or resume. Pausing in the breath between repeats cancels the next
 * one; resuming then replays the verse (the player restarts a single verse
 * that played to its end), and the count carries on.
 */
export function toggleListening() {
  const state = listeningStore.get();
  if (state.mode === 'idle') return;
  const player = playerStore.get();
  if (player.playing || player.loading) return togglePause();
  if (state.between) {
    clearTimeout(repeatTimer);
    return listeningStore.set({ ...state, between: false });
  }
  togglePause();
}

/**
 * Whether listening is under way, for the play/pause button.
 */
export function isListening(state: Listening, player: { playing: boolean; loading: boolean }): boolean {
  return state.mode !== 'idle' && (player.playing || player.loading || state.between);
}

export function stopListening() {
  reset();
  const wasListening = listeningStore.get().mode !== 'idle';
  listeningStore.set(idle);
  if (wasListening) stop();
}
