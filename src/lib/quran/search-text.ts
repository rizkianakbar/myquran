/**
 * Text folding shared by the search worker and the results view.
 */

/**
 * Strip harakat and Quranic annotation marks so a plain-typed Arabic query
 * matches the fully vocalized Uthmani text; alef variants fold to bare alef.
 * Tatweel (the stretching stroke in الرحمـن) goes too.
 */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[آأإٱ]/g, 'ا');
}

export function normalizeLatin(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Transliterations vary in hyphens, apostrophes and spacing ("bismillahir-
 * rahmanir" vs "bismillah ar-rahman"), so compare letters only.
 */
export function compactLatin(text: string): string {
  return normalizeLatin(text).replace(/[^a-z0-9]/g, '');
}

export const ARABIC_SCRIPT = /[؀-ۿ]/;
