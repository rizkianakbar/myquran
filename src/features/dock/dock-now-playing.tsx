import { Link, useRouterState } from '@tanstack/react-router';
import { Loader2, Pause, Play, X } from 'lucide-react';
import { usePlayer } from '#/features/audio/audio.hooks.ts';
import { stop, togglePause } from '#/features/audio/audio.lib.ts';
import { returnToRecitation } from '#/features/audio/audio-follow.lib.ts';
import { useT } from '#/lib/i18n.ts';
import { formatRate, stepPlaybackRate, usePrefs } from '#/lib/prefs.ts';
import { useChapters } from '#/lib/quran/data.ts';
import { cn } from '#/lib/utils.ts';

/**
 * Transport for whatever is being recited. It sits centred above the
 * medallion, outside the dock's row, so playing audio never shifts the dock.
 */
export function NowPlaying() {
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
