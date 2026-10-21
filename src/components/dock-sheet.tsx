import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Drawer, DrawerContent, DrawerTitle } from '#/components/ui/drawer.tsx';
import { useT } from '#/lib/i18n.ts';
import { usePlayer } from '#/lib/player.ts';
import { closeDock, type DockView, dockStore } from '#/lib/prefs.ts';
import { useIsPhone } from '#/lib/use-media-query.ts';
import { useVisualViewport } from '#/lib/use-visual-viewport.ts';
import { cn } from '#/lib/utils.ts';
import { starOutline } from './ornament/geometry.ts';
import { JournalPanel } from './sheets/journal-panel.tsx';
import { SearchPanel } from './sheets/search-panel.tsx';
import { SurahList } from './sheets/surah-list.tsx';
import { ShortcutList } from './shortcut-list.tsx';

function SheetContent({ view }: { view: DockView }) {
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

function useSheetTitles(): Record<DockView, string> {
  const t = useT();
  return { surahs: t.surahs, search: t.search, journal: t.journal, shortcuts: t.shortcuts };
}

function StarMark() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4 shrink-0 text-gold">
      <path d={starOutline({ cx: 10, cy: 10, r: 9.5, inner: 6.5, n: 8 })} fill="currentColor" />
    </svg>
  );
}

function CloseButton() {
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
 * Phones: a swipeable bottom drawer. It keeps rendering the last view while
 * it slides away, so closing never flashes an empty sheet.
 */
function PhoneSheet({ view }: { view: DockView | null }) {
  const titles = useSheetTitles();
  const lastView = useRef<DockView>('surahs');
  if (view) lastView.current = view;
  const shown = view ?? lastView.current;
  // Sit above the on-screen keyboard (search focuses its field on open)
  // rather than being pushed off the top of the screen by it.
  const visible = useVisualViewport(view !== null);

  return (
    <Drawer open={view !== null} onOpenChange={(open) => !open && closeDock()} showSwipeHandle>
      <DrawerContent
        id="dock-sheet"
        className="rounded-t-[1.75rem] border-gold/35 pb-[env(safe-area-inset-bottom)]"
        style={{
          height: visible ? `min(88dvh, ${visible.height - 24}px)` : '88dvh',
          bottom: visible?.bottom ?? 0,
        }}>
        <header className="flex items-center gap-3 border-b px-5 pt-1 pb-3">
          <StarMark />
          <DrawerTitle className="font-serif text-lg font-normal">{titles[shown]}</DrawerTitle>
          <span className="grow" />
          <CloseButton />
        </header>
        <div className="flex min-h-0 grow flex-col">
          <SheetContent view={shown} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Larger screens: a sheet that grows out of the dock, rather than a sidebar
 * that pushes the page around.
 */
function FloatingSheet({ view }: { view: DockView }) {
  const t = useT();
  const titles = useSheetTitles();
  const sheetRef = useRef<HTMLDivElement>(null);
  const hasTransport = usePlayer().surah !== null;

  useEffect(() => {
    const field = sheetRef.current?.querySelector<HTMLElement>('input, [href], button:not([data-close])');
    field?.focus({ preventScroll: true });
  }, []);

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.close}
        onClick={closeDock}
        className="fixed inset-0 z-40 animate-in cursor-default bg-lapis/25 backdrop-blur-[2px] duration-200 fade-in"
      />
      <div
        ref={sheetRef}
        id="dock-sheet"
        role="dialog"
        aria-label={titles[view]}
        className={cn(
          'fixed inset-x-3 z-50',
          // Clear the now-playing pill when it sits above the dock.
          hasTransport
            ? 'bottom-[calc(9.25rem+env(safe-area-inset-bottom))] h-[min(38rem,calc(100dvh-11.5rem))]'
            : 'bottom-[calc(5.75rem+env(safe-area-inset-bottom))] h-[min(38rem,calc(100dvh-8rem))]',
          'mx-auto flex max-w-4xl origin-bottom animate-in flex-col overflow-hidden rounded-[1.75rem] bg-popover text-popover-foreground shadow-2xl ring-1 ring-gold/35 duration-200 ease-out fade-in zoom-in-95 slide-in-from-bottom-6',
        )}>
        <header className="flex items-center gap-3 border-b px-5 py-3">
          <StarMark />
          <h2 className="font-serif text-lg">{titles[view]}</h2>
          <span className="grow" />
          <kbd className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">Esc</kbd>
          <CloseButton />
        </header>
        <div className="flex min-h-0 grow flex-col">
          <SheetContent view={view} />
        </div>
      </div>
    </>
  );
}

/**
 * The panels behind the dock's buttons: a bottom drawer on phones, a
 * floating sheet elsewhere. Escape, the backdrop, or the dock button close it.
 */
export function DockSheet() {
  const view = dockStore.use();
  const isPhone = useIsPhone();

  if (isPhone) return <PhoneSheet view={view} />;
  return view ? <FloatingSheet view={view} /> : null;
}
