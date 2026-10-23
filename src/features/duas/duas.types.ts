import type { Language } from '#/lib/prefs.ts';

export type Localized<T = string> = Record<Language, T>;

export interface Dua {
  id: string;
  arabic: string;
  title: Localized;
  /**
   * Transliteration; the Indonesian one follows Kemenag's style.
   */
  latin: Localized;
  translation: Localized;
  /**
   * How to say it, e.g. "Recite 3x".
   */
  notes: Localized<string | null>;
  benefits: Localized<string | null>;
  /**
   * Where it is narrated, e.g. "HR. Abu Dawud No. 4241".
   */
  source: Localized<string | null>;
}

export interface DuaCategory {
  slug: string;
  name: Localized;
  count: number;
}

export interface DuaIndex {
  categories: DuaCategory[];
}
