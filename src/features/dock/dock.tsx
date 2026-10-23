import { Link, useRouterState } from '@tanstack/react-router';
import { BookOpen, Feather, Search, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import { Medallion } from '#/components/ornament/medallion.tsx';
import { usePlayer } from '#/features/audio/audio.hooks.ts';
import { chromeHiddenStore } from '#/lib/chrome.ts';
import { useT } from '#/lib/i18n.ts';
import { type DockView, dockStore, toggleDock } from '#/lib/prefs.ts';
import { cn } from '#/lib/utils.ts';
import { NowPlaying } from './dock-now-playing.tsx';
import { ReturnChip } from './dock-return-chip.tsx';

const dockButton =
  'pressable flex h-10 items-center gap-2 rounded-full px-3 text-sm text-(--muted-foreground) [--press-scale:0.92] hover:text-gold-ink focus-visible:outline-2 focus-visible:outline-gold [&_svg]:size-[1.15rem] [&_svg]:shrink-0';
const dockButtonActive = 'bg-gold/15 text-gold-ink';

function SheetButton({ view, label, children }: { view: DockView; label: string; children: ReactNode }) {
  const open = dockStore.use() === view;
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      aria-controls="dock-sheet"
      title={label}
      onClick={() => toggleDock(view)}
      className={cn(dockButton, open && dockButtonActive)}>
      {children}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

/**
 * The floating dock: the app's only navigation. It is a three-column grid —
 * the two `1fr` sides always resolve to the same width, so the medallion
 * sits at the true centre whatever the labels' lengths or language.
 */
export function Dock() {
  const t = useT();
  const player = usePlayer();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const atHome = pathname === '/';
  const hidden = chromeHiddenStore.use();

  return (
    <div
      inert={hidden}
      className={cn(
        // Only as wide as the pill, never a full-width box: iOS Safari takes a fixed element
        // spanning the bottom of the screen for a toolbar and paints a solid strip under its
        // own toolbar (kept until reload), cutting the page short.
        'dark pointer-events-none fixed bottom-[calc(0.875rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex w-max max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-col items-center transition-[translate,opacity,visibility] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        // A fade with a short drift that never reaches the screen edge; `invisible` once faded.
        hidden && 'invisible translate-y-3 opacity-0',
      )}>
      <ReturnChip />
      <NowPlaying />
      <nav
        aria-label="Primary"
        className="pointer-events-auto relative grid grid-cols-[1fr_auto_1fr] items-center rounded-full bg-(--ornament-field) px-1.5 py-1.5 text-foreground shadow-[0_18px_50px_-12px_oklch(0.2_0.06_262/0.55)] ring-1 ring-gold/45">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0.75 rounded-full ring-1 ring-gold/15" />

        <div className="flex justify-end gap-0.5">
          <SheetButton view="surahs" label={t.surahs}>
            <BookOpen />
          </SheetButton>
          <SheetButton view="search" label={t.search}>
            <Search />
          </SheetButton>
        </div>

        <Link
          to="/"
          aria-label={t.home}
          title={t.home}
          aria-current={atHome ? 'page' : undefined}
          className="pressable group relative mx-2 -my-5 size-17 shrink-0 rounded-full [--press-scale:0.94] drop-shadow-[0_6px_14px_oklch(0.15_0.05_262/0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
          <Medallion className="size-full" spinning={player.playing} />
        </Link>

        <div className="flex justify-start gap-0.5">
          <SheetButton view="journal" label={t.journal}>
            <Feather />
          </SheetButton>
          <Link
            to="/settings"
            aria-label={t.settings}
            title={t.settings}
            className={cn(dockButton, pathname === '/settings' && dockButtonActive)}>
            <Settings />
            <span className="hidden md:inline">{t.settings}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
