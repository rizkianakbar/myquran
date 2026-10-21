import { X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { starOutline } from '#/components/ornament/geometry.ts';
import { ShortcutList } from '#/components/shortcut-list.tsx';
import { JournalPanel } from '#/features/journal/journal-panel.tsx';
import { SearchPanel } from '#/features/search/search-panel.tsx';
import { SurahList } from '#/features/surahs/surah-list.tsx';
import { useT } from '#/lib/i18n.ts';
import { closeDock, type DockView } from '#/lib/prefs.ts';

export function SheetContent({ view }: { view: DockView }) {
  if (view === 'search') return <SearchPanel />;
  if (view === 'journal') return <JournalPanel />;
  if (view === 'shortcuts') {
    return (
      <div className="min-h-0 grow overflow-y-auto overscroll-contain px-6 py-5">
        <ShortcutList columns />
      </div>
    );
  }
  return <SurahList />;
}

export function useSheetTitles(): Record<DockView, string> {
  const t = useT();
  return { surahs: t.surahs, search: t.search, journal: t.journal, shortcuts: t.shortcuts };
}

export function StarMark() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4 shrink-0 text-gold">
      <path d={starOutline({ cx: 10, cy: 10, r: 9.5, inner: 6.5, n: 8 })} fill="currentColor" />
    </svg>
  );
}

export function CloseButton() {
  const t = useT();
  return (
    <button
      type="button"
      data-close
      aria-label={t.close}
      onClick={closeDock}
      className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-4">
      <X />
    </button>
  );
}

/**
 * Mounts its children a frame after it mounts, then fades them in. The sheet
 * starts sliding on the first frame instead of waiting for a panel of a
 * hundred rows to render; the slide runs on the compositor, so the panel's
 * render then can't stall it.
 */
export function AfterFirstFrame({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setReady(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!ready) return null;
  return <div className="flex min-h-0 grow animate-in flex-col duration-200 fade-in">{children}</div>;
}
