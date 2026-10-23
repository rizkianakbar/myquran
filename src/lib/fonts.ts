import amiriQuran from '@fontsource/amiri-quran/files/amiri-quran-arabic-400-normal.woff2?url';
import notoNaskh from '@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-400-normal.woff2?url';
import reemKufi from '@fontsource/reem-kufi/files/reem-kufi-arabic-500-normal.woff2?url';
import scheherazade from '@fontsource/scheherazade-new/files/scheherazade-new-arabic-400-normal.woff2?url';
import geist from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url';
import literata from '@fontsource-variable/literata/files/literata-latin-opsz-normal.woff2?url';
import { type ArabicFont, arabicFonts } from '#/lib/prefs.ts';

/**
 * Font files every page draws with on first paint (UI, serif, Kufi titles).
 * Preloaded from the document head so they download alongside the stylesheet
 * instead of after it. They resolve to the same hashed assets the
 * stylesheet's `@font-face` rules point at.
 */
export const criticalFontFiles = [geist, literata, reemKufi];

/**
 * The file behind each Arabic font choice. Only the reader's chosen one is
 * preloaded, by the inline script in `__root.tsx` that reads their prefs.
 */
export const arabicFontFiles: Record<ArabicFont, string> = {
  amiri: amiriQuran,
  scheherazade,
  noto: notoNaskh,
};

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
