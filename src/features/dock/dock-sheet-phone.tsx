import { useEffect, useRef, useState } from 'react';
import { Drawer, DrawerContent, DrawerTitle } from '#/components/ui/drawer.tsx';
import { useVisualViewport } from '#/hooks/use-visual-viewport.ts';
import { onIdle } from '#/lib/idle.ts';
import { closeDock, type DockView } from '#/lib/prefs.ts';
import { useSheetTitles } from './dock.hooks.ts';
import { AfterFirstFrame, CloseButton, SheetContent, StarMark } from './dock-sheet-parts.tsx';

/**
 * Phones: a swipeable bottom drawer. It stays mounted once opened, so
 * reopening it renders nothing new, and it keeps the last view while it
 * slides away, so closing never flashes an empty sheet.
 */
export function PhoneSheet({ view }: { view: DockView | null }) {
  const titles = useSheetTitles();
  const lastView = useRef<DockView>('surahs');
  if (view) lastView.current = view;
  const shown = view ?? lastView.current;
  // Mounted (hidden) once the page is idle, so even the first tap only has to
  // slide it in; mounting it then cost a ~100ms stall on a mid-range phone.
  const [warm, setWarm] = useState(false);
  if (view && !warm) setWarm(true);

  useEffect(() => onIdle(() => setWarm(true), { timeout: 4000, fallbackDelay: 2000 }), []);
  // Sit above the on-screen keyboard (search focuses its field on open)
  // rather than being pushed off the top of the screen by it.
  const visible = useVisualViewport(view !== null);

  return (
    <Drawer open={view !== null} onOpenChange={(open) => !open && closeDock()} showSwipeHandle>
      <DrawerContent
        keepMounted={warm}
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
          <AfterFirstFrame key={shown}>
            <SheetContent view={shown} />
          </AfterFirstFrame>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
