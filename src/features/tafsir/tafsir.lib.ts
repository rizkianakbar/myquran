import type { TafsirSlug } from '#/lib/quran/types.ts';

export interface TafsirSource {
  slug: TafsirSlug;
  label: string;
  html: boolean;
}

const IBN_KATHIR: TafsirSource = { slug: 'ibn-kathir', label: 'Ibn Kathir', html: true };
const KEMENAG: TafsirSource = { slug: 'kemenag', label: 'Tafsir Kemenag', html: false };

/**
 * No properly licensed Indonesian Ibn Kathir is available, so Indonesian
 * readers get Kemenag first with the English Ibn Kathir as a second source.
 */
export const sourcesByLanguage = {
  en: [IBN_KATHIR],
  id: [KEMENAG, { ...IBN_KATHIR, label: 'Ibn Kathir (EN)' }],
};

const ALLOWED_TAGS = new Set([
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'STRONG',
  'B',
  'EM',
  'I',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'BR',
  'SPAN',
  'DIV',
  'SUP',
]);

/**
 * Keep structural tags, drop every attribute (inline colours fight the
 * theme) and unwrap anything not on the allowlist.
 */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const el of [...doc.body.querySelectorAll('*')].reverse()) {
    if (!ALLOWED_TAGS.has(el.tagName)) {
      el.replaceWith(...(el.tagName === 'SCRIPT' || el.tagName === 'STYLE' ? [] : el.childNodes));
      continue;
    }
    for (const attr of [...el.attributes]) el.removeAttribute(attr.name);
  }
  return doc.body.innerHTML;
}
