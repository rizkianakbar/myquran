import { Link, useRouterState } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, BookOpen, Feather, Loader2, Pause, Play, Search, Settings, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { followStore, returnToRecitation } from '#/lib/follow.ts';
import { useT } from '#/lib/i18n.ts';
import { stop, togglePause, usePlayer } from '#/lib/player.ts';
import { type DockView, dockStore, formatRate, stepPlaybackRate, toggleDock, usePrefs } from '#/lib/prefs.ts';
import { useChapters } from '#/lib/quran/data.ts';
import { cn } from '#/lib/utils.ts';
import { Medallion } from './ornament/medallion.tsx';

const dockButton =
  'flex h-10 items-center gap-2 rounded-full px-3 text-sm text-(--muted-foreground) transition-colors hover:text-gold-ink focus-visible:outline-2 focus-visible:outline-gold [&_svg]:size-[1.15rem] [&_svg]:shrink-0';
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
 * Shown once the reader scrolls away from the recited verse; points the way
 * back and returns them there.
 */
function ReturnChip() {
  const t = useT();
  const { detached, direction, resumeAt } = followStore.use();
  const { verse } = usePlayer();
  if (!detached || verse === null) return null;

  return (
    <button
      type="button"
      onClick={() => returnToRecitation()}
      className="pointer-events-auto relative mb-2.5 flex h-9 animate-in items-center gap-2 overflow-hidden rounded-full bg-gold pr-2 pl-3.5 text-sm font-medium text-lapis shadow-[0_10px_24px_-8px_oklch(0.2_0.06_262/0.6)] transition-colors duration-200 fade-in slide-in-from-bottom-2 hover:bg-gold/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold [&_svg]:size-4">
      {direction === 'up' ? <ArrowUp /> : <ArrowDown />}
      {t.backToVerse(verse)}
      <kbd className="ml-1 rounded border border-lapis/30 px-1.5 text-[11px] font-normal">R</kbd>
      {/* Drains until follow resumes on its own; refills while they scroll. */}
      {resumeAt !== null && (
        <span
          key={resumeAt}
          aria-hidden="true"
          className="resume-drain absolute bottom-0 left-0 h-0.5 w-full origin-left bg-lapis/45"
          style={{ animationDuration: `${Math.max(0, resumeAt - Date.now())}ms` }}
        />
      )}
    </button>
  );
}

/**
 * Transport for whatever is being recited. It sits centred above the
 * medallion, outside the dock's row, so playing audio never shifts the dock.
 */
function NowPlaying() {
  const t = useT();
  const state = usePlayer();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { playbackRate } = usePrefs();
  const { data: chapters = [] } = useChapters();
  if (state.surah === null || state.verse === null) return null;

  return (
    <section
      aria-label={t.nowPlaying}
      className="pointer-events-auto mb-4 flex animate-in items-center gap-1 rounded-full bg-(--ornament-field) py-1 pr-1 pl-1 text-foreground shadow-[0_12px_30px_-10px_oklch(0.2_0.06_262/0.5)] ring-1 ring-gold/40 duration-300 fade-in slide-in-from-bottom-3">
      <button
        type="button"
        aria-label={state.playing ? t.pause : t.resume}
        onClick={togglePause}
        className="flex size-8 items-center justify-center rounded-full bg-gold text-lapis transition-colors hover:bg-gold/85 [&_svg]:size-3.5">
        {state.loading ? <Loader2 className="animate-spin" /> : state.playing ? <Pause /> : <Play />}
      </button>
      <Link
        to="/surah/$surah"
        params={{ surah: state.surah }}
        hash={`v${state.verse}`}
        onClick={(event) => {
          // Already on this surah: scroll back instead of a no-op hash change.
          if (pathname === `/surah/${state.surah}` && returnToRecitation()) event.preventDefault();
        }}
        className="px-2 text-sm whitespace-nowrap hover:text-gold-ink">
        <span className="font-serif">{chapters[state.surah - 1]?.nameSimple}</span>{' '}
        <span className="text-gold-ink tabular-nums">
          {state.surah}:{state.verse}
        </span>
      </Link>
      <button
        type="button"
        aria-label={t.speedLabel(formatRate(playbackRate))}
        title={t.speed}
        onClick={() => stepPlaybackRate(1, { wrap: true })}
        className={cn(
          'flex h-7 min-w-11 items-center justify-center rounded-full px-2 text-xs tabular-nums ring-1 ring-gold/35 transition-colors hover:bg-gold/15 hover:text-gold-ink',
          playbackRate === 1 ? 'text-muted-foreground' : 'bg-gold/15 text-gold-ink ring-gold/60',
        )}>
        {formatRate(playbackRate)}
      </button>
      <button
        type="button"
        aria-label={t.stop}
        onClick={stop}
        className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-gold-ink [&_svg]:size-3.5">
        <X />
      </button>
      {state.error && <span className="sr-only">{state.error}</span>}
    </section>
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

  return (
    <div className="dark pointer-events-none fixed inset-x-0 bottom-[calc(0.875rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center px-3">
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
          className="group relative mx-2 -my-5 size-17 shrink-0 rounded-full drop-shadow-[0_6px_14px_oklch(0.15_0.05_262/0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
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
