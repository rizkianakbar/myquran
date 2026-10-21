import { prefsStore } from './prefs.ts';
import { getSurahAudio, type SurahAudio, wordAudioUrl } from './quran/audio.ts';
import { createStore } from './store.ts';

export interface PlayerState {
  surah: number | null;
  verse: number | null;
  /**
   * 1-based position of the word being recited, for the follow-along highlight.
   */
  word: number | null;
  playing: boolean;
  loading: boolean;
  /**
   * Keep going past the current verse until the surah ends.
   */
  continuous: boolean;
  error: string | null;
}

const idle: PlayerState = {
  surah: null,
  verse: null,
  word: null,
  playing: false,
  loading: false,
  continuous: false,
  error: null,
};

/**
 * Where recitation was, so a reload comes back paused on the same spot
 * instead of starting the surah over. Written on verse changes, pauses and
 * page hide only, so immediate (undebounced) writes stay cheap and the
 * last write is guaranteed to land before unload.
 */
interface SavedPlayback {
  surah: number;
  verse: number;
  ms: number;
  continuous: boolean;
  reciter: number;
}

const savedPlayback = createStore<SavedPlayback | null>(null, { key: 'quran:playback' });

function restoredState(): PlayerState {
  const saved = savedPlayback.get();
  if (!saved) return idle;
  return { ...idle, surah: saved.surah, verse: saved.verse, continuous: saved.continuous };
}

export const playerStore = createStore<PlayerState>(restoredState());

export function usePlayer() {
  return playerStore.use();
}

const audio = typeof Audio !== 'undefined' ? new Audio() : null;
let loaded: { reciter: number; surah: number; data: SurahAudio } | null = null;
let frame = 0;
let requestId = 0;

function update(patch: Partial<PlayerState>) {
  playerStore.set((prev) => ({ ...prev, ...patch }));
}

function findPosition(data: SurahAudio, ms: number): { verse: number; word: number | null } | null {
  const timing = data.verses.find((t) => ms >= t.from && ms < t.to);
  if (!timing) return null;
  const word = timing.words.find(([, from, to]) => ms >= from && ms < to);
  return { verse: timing.verse, word: word?.[0] ?? null };
}

function savePosition() {
  const { surah, verse, continuous } = playerStore.get();
  if (!audio || surah === null || verse === null || !loaded) return;
  savedPlayback.set({ surah, verse, continuous, ms: audio.currentTime * 1000, reciter: loaded.reciter });
}

function tick() {
  if (!audio || !loaded) return;
  const state = playerStore.get();
  const ms = audio.currentTime * 1000;
  const verseEnd = loaded.data.verses.find((t) => t.verse === state.verse)?.to;

  if (!state.continuous && verseEnd !== undefined && ms >= verseEnd) {
    audio.pause();
    update({ playing: false, word: null });
    return;
  }

  const found = findPosition(loaded.data, ms);
  // Between two words no segment matches; hold the last word rather than
  // flashing the whole verse back to "upcoming".
  const position = found && {
    verse: found.verse,
    word: found.word ?? (found.verse === state.verse ? state.word : null),
  };
  if (position && (position.verse !== state.verse || position.word !== state.word)) {
    update(position);
    if (position.verse !== state.verse) savePosition();
  }
  frame = requestAnimationFrame(tick);
}

/**
 * Loading a new src resets `playbackRate` to `defaultPlaybackRate`, so set
 * both; `preservesPitch` keeps a slowed reciter sounding natural.
 */
function applyPlaybackRate() {
  if (!audio) return;
  const rate = prefsStore.get().playbackRate;
  audio.preservesPitch = true;
  audio.defaultPlaybackRate = rate;
  audio.playbackRate = rate;
}

if (audio) {
  audio.preload = 'auto';
  applyPlaybackRate();
  audio.addEventListener('playing', () => {
    update({ playing: true, loading: false });
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(tick);
  });
  audio.addEventListener('pause', () => {
    cancelAnimationFrame(frame);
    update({ playing: false });
    savePosition();
  });
  window.addEventListener('pagehide', () => {
    if (!audio.paused) savePosition();
  });
  audio.addEventListener('waiting', () => update({ loading: true }));
  audio.addEventListener('ended', () => stop());
  audio.addEventListener('error', () => update({ playing: false, loading: false, error: 'Audio failed to load' }));
}

async function loadSurah(surah: number): Promise<SurahAudio> {
  const reciter = prefsStore.get().reciter;
  if (loaded?.reciter === reciter && loaded.surah === surah) return loaded.data;
  const data = await getSurahAudio(reciter, surah);
  loaded = { reciter, surah, data };
  return data;
}

/**
 * Start reciting from a verse. A newer call cancels an in-flight one, so
 * rapid taps never leave two seeks racing each other.
 */
export async function play(surah: number, verse: number, opts: { continuous?: boolean; fromMs?: number } = {}) {
  if (!audio) return;
  const id = ++requestId;
  update({ surah, verse, word: null, loading: true, continuous: !!opts.continuous, error: null });

  try {
    const data = await loadSurah(surah);
    if (id !== requestId) return;
    const timing = data.verses.find((t) => t.verse === verse);
    if (!timing) throw new Error('No timing for this verse');
    if (audio.src !== data.url) audio.src = data.url;
    const resumeInVerse = opts.fromMs !== undefined && opts.fromMs >= timing.from && opts.fromMs < timing.to;
    audio.currentTime = (resumeInVerse ? opts.fromMs! : timing.from) / 1000;
    await audio.play();
  } catch (error) {
    if (id !== requestId) return;
    update({ playing: false, loading: false, error: error instanceof Error ? error.message : 'Playback failed' });
  }
}

export function togglePause() {
  const state = playerStore.get();
  if (!audio || state.surah === null || state.verse === null) return;
  // Restored after a reload: nothing is loaded yet, so start from the saved spot.
  if (!loaded) return void resumeSaved(state.surah, state.verse, state.continuous);
  // A single verse that played to its end sits paused at the verse boundary;
  // resuming there would be paused again on the next tick, so replay it.
  if (audio.paused && singleVerseFinished(state)) return void play(state.surah, state.verse);
  if (audio.paused) void audio.play();
  else audio.pause();
}

function singleVerseFinished(state: PlayerState): boolean {
  if (state.continuous || !audio || !loaded || loaded.surah !== state.surah) return false;
  const end = loaded.data.verses.find((t) => t.verse === state.verse)?.to;
  return end !== undefined && audio.currentTime * 1000 >= end - 50;
}

function resumeSaved(surah: number, verse: number, continuous: boolean) {
  const saved = savedPlayback.get();
  const sameSpot = saved?.surah === surah && saved.verse === verse && saved.reciter === prefsStore.get().reciter;
  // Timestamps belong to one reciter's recording; with another, restart the verse.
  void play(surah, verse, { continuous, fromMs: sameSpot ? saved.ms : undefined });
}

/**
 * The per-verse play button: pause/resume if this verse is the one loaded
 * as a single verse, otherwise start it fresh.
 */
export function toggleVerse(surah: number, verse: number) {
  const state = playerStore.get();
  const isThis = state.surah === surah && state.verse === verse && !state.continuous;
  if (isThis && state.playing) audio?.pause();
  else void play(surah, verse);
}

/**
 * Jump the recitation to a neighbouring verse, keeping its mode.
 */
export function skipVerse(delta: number) {
  const state = playerStore.get();
  if (state.surah === null || state.verse === null) return;
  const target = state.verse + delta;
  if (target < 1) return;
  // Before anything is loaded (just restored) play() itself rejects verses past the end.
  if (loaded?.surah === state.surah && !loaded.data.verses.some((t) => t.verse === target)) return;
  void play(state.surah, target, { continuous: state.continuous });
}

export function isLoaded() {
  return playerStore.get().surah !== null;
}

export function stop() {
  requestId++;
  cancelAnimationFrame(frame);
  audio?.pause();
  playerStore.set(idle);
  savedPlayback.set(null);
}

/**
 * Prefetch the timing data so the first press of play starts promptly.
 */
export function warm(surah: number) {
  void getSurahAudio(prefsStore.get().reciter, surah).catch(() => {});
}

const wordAudio = typeof Audio !== 'undefined' ? new Audio() : null;

export function playWord(surah: number, verse: number, word: number) {
  if (!wordAudio) return;
  audio?.pause();
  wordAudio.src = wordAudioUrl(surah, verse, word);
  void wordAudio.play().catch(() => {});
}

prefsStore.subscribe(() => {
  if (loaded && loaded.reciter !== prefsStore.get().reciter && playerStore.get().surah !== null) stop();
  if (audio && audio.playbackRate !== prefsStore.get().playbackRate) applyPlaybackRate();
});
