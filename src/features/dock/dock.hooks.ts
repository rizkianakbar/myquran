import { useT } from '#/lib/i18n.ts';
import type { DockView } from '#/lib/prefs.ts';

export function useSheetTitles(): Record<DockView, string> {
  const t = useT();
  return { surahs: t.surahs, search: t.search, journal: t.journal, shortcuts: t.shortcuts };
}
