import { createStore } from './store.ts';

export type Language = 'en' | 'id';
export type Theme = 'light' | 'dark' | 'sepia' | 'night';
export type ArabicFont = 'amiri' | 'scheherazade' | 'noto';
/**
 * 'auto' follows the UI language; 'off' hides translations.
 */
export type TranslationPref = 'auto' | 'en' | 'id' | 'off';
/**
 * 'kemenag' is the marked transliteration printed in Indonesian mushafs;
 * 'simple' drops the diacritics for readers who find them distracting.
 */
export type LatinStyle = 'kemenag' | 'simple';
/**
 * The sheets that rise out of the dock.
 */
export type DockView = 'surahs' | 'search' | 'journal' | 'shortcuts';

export const themes: Theme[] = ['light', 'dark', 'sepia', 'night'];
export const darkThemes = new Set<Theme>(['dark', 'night']);

export const arabicFonts: Record<ArabicFont, { label: string; family: string }> = {
  amiri: { label: 'Amiri Quran', family: "'Amiri Quran'" },
  scheherazade: { label: 'Scheherazade New', family: "'Scheherazade New'" },
  noto: { label: 'Noto Naskh Arabic', family: "'Noto Naskh Arabic'" },
};

export interface Prefs {
  language: Language;
  theme: Theme;
  arabicFont: ArabicFont;
  /**
   * Arabic text size in rem.
   */
  arabicSize: number;
  translation: TranslationPref;
  /**
   * Show a Latin transliteration under each verse.
   */
  latin: boolean;
  latinStyle: LatinStyle;
  wordByWord: boolean;
  focusMode: boolean;
  reciter: number;
  /**
   * Recitation speed; pitch is preserved.
   */
  playbackRate: number;
}

const prefersDark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;

export const prefsStore = createStore<Prefs>(
  {
    language: navigator.language.startsWith('id') ? 'id' : 'en',
    theme: prefersDark ? 'dark' : 'light',
    arabicFont: 'amiri',
    arabicSize: 2,
    translation: 'auto',
    latin: false,
    latinStyle: 'kemenag',
    wordByWord: true,
    focusMode: false,
    reciter: 7,
    playbackRate: 1,
  },
  { key: 'quran:prefs' },
);

export function usePrefs() {
  return prefsStore.use();
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  prefsStore.set((prev) => ({ ...prev, [key]: value }));
}

/**
 * Which translation to show, resolving 'auto' against the UI language.
 */
export function resolveTranslation(prefs: Prefs): Language | null {
  if (prefs.translation === 'off') return null;
  return prefs.translation === 'auto' ? prefs.language : prefs.translation;
}

export const playbackRates = [0.5, 0.75, 1, 1.25, 1.5];

/**
 * Step the recitation speed one notch slower (-1) or faster (1); with
 * `wrap`, stepping past the fastest returns to the slowest (the pill's
 * single tap-to-cycle button).
 */
export function stepPlaybackRate(direction: 1 | -1, opts: { wrap?: boolean } = {}) {
  const current = playbackRates.indexOf(prefsStore.get().playbackRate);
  const from = current === -1 ? playbackRates.indexOf(1) : current;
  const next = opts.wrap
    ? (from + direction + playbackRates.length) % playbackRates.length
    : Math.min(Math.max(from + direction, 0), playbackRates.length - 1);
  setPref('playbackRate', playbackRates[next]);
}

export function formatRate(rate: number): string {
  return `${rate}×`;
}

/**
 * The transliteration to show for a verse, or null when Latin is off.
 */
export function resolveLatin(prefs: Prefs, verse: { latinId: string; latinEn: string }): string | null {
  if (!prefs.latin) return null;
  return prefs.latinStyle === 'kemenag' ? verse.latinId : verse.latinEn;
}

/**
 * Session-only: which dock sheet is open, if any.
 */
export const dockStore = createStore<DockView | null>(null);

/**
 * Pressing the open sheet's button closes it; any other opens that sheet.
 */
export function toggleDock(view: DockView) {
  dockStore.set((current) => (current === view ? null : view));
}

export function closeDock() {
  dockStore.set(null);
}
