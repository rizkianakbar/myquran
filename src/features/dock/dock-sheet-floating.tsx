import { useEffect, useRef } from 'react';
import { usePlayer } from '#/features/audio/audio.hooks.ts';
import { useT } from '#/lib/i18n.ts';
import { closeDock, type DockView } from '#/lib/prefs.ts';
import { cn } from '#/lib/utils.ts';
import { CloseButton, SheetContent, StarMark, useSheetTitles } from './dock-sheet-parts.tsx';

/**
 * Larger screens: a sheet that grows out of the dock, rather than a sidebar
 * that pushes the page around.
 */
export function FloatingSheet({ view }: { view: DockView }) {
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
