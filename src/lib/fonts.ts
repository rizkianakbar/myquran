import { type ArabicFont, arabicFonts } from '#/lib/prefs.ts';

/**
 * Past this, show the text in fallback fonts rather than keep the page blank.
 */
const FONT_TIMEOUT_MS = 1500;

const pending = new Map<ArabicFont, Promise<void>>();
const ready = new Set<ArabicFont>();

/**
 * Fetch the reader's fonts (the chosen Arabic face, the Kufi titles, the serif
 * translation) ahead of rendering. Fontsource faces use `font-display: swap`,
 * so text drawn before they land reflows when they do; waiting avoids that.
 */
export function loadReaderFonts(font: ArabicFont): Promise<void> {
  let hit = pending.get(font);
  if (!hit) {
    const loads = [
      document.fonts.load(`1em ${arabicFonts[font].family}`, 'بسم'),
      document.fonts.load(`1em 'Reem Kufi'`, 'بسم'),
      document.fonts.load(`1em 'Literata Variable'`, 'A'),
    ];
    const timeout = new Promise((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS));
    hit = Promise.race([Promise.allSettled(loads), timeout]).then(() => {
      ready.add(font);
    });
    pending.set(font, hit);
  }
  return hit;
}

/**
 * Whether `loadReaderFonts` has settled for this font.
 */
export function readerFontsReady(font: ArabicFont): boolean {
  return ready.has(font);
}
