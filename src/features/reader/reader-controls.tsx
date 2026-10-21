import { Focus, Languages, Loader2, Pause, Play } from 'lucide-react';
import { reciters } from '#/features/audio/audio.api.ts';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { cn } from '#/lib/utils.ts';

export type SurahPlayback = 'idle' | 'loading' | 'playing' | 'paused';

export interface SurahControlsProps {
  playback: SurahPlayback;
  focusMode: boolean;
  latin: boolean;
  onTogglePlay: () => void;
  onToggleFocus: () => void;
  onToggleLatin: () => void;
}

function playLabel(t: ReturnType<typeof useT>, playback: SurahPlayback) {
  if (playback === 'playing') return t.pause;
  if (playback === 'paused') return t.resume;
  return t.playSurah;
}

function PlayGlyph({ playback }: { playback: SurahPlayback }) {
  if (playback === 'loading') return <Loader2 className="animate-spin" />;
  if (playback === 'playing') return <Pause />;
  return <Play className="translate-x-px" />;
}

/**
 * A gilt pill for an on/off reading option.
 */
function ToggleControl({
  pressed,
  onClick,
  icon,
  label,
  detail,
}: {
  pressed: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'flex h-12 items-center gap-3 rounded-full py-1.5 pr-5 pl-1.5 ring-1 ring-gold/50 transition-colors hover:bg-gold/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        pressed && 'bg-gold/12',
      )}>
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-full text-gold-ink ring-1 ring-gold/60 transition-colors [&_svg]:size-4',
          pressed && 'bg-gold text-lapis ring-0',
        )}>
        {icon}
      </span>
      <span className="text-left leading-tight">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}

/**
 * The surah's primary actions, labelled and set right under the
 * headpiece, as gilt pills that belong to the illumination.
 */
export function SurahControls({
  playback,
  focusMode,
  latin,
  onTogglePlay,
  onToggleFocus,
  onToggleLatin,
}: SurahControlsProps) {
  const t = useT();
  const { reciter } = usePrefs();
  const reciterName = reciters.find((r) => r.id === reciter)?.name;
  const active = playback !== 'idle';

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        aria-pressed={active}
        onClick={onTogglePlay}
        className={cn(
          'group flex h-12 items-center gap-3 rounded-full py-1.5 pr-5 pl-1.5 ring-1 ring-gold/50 transition-colors hover:bg-gold/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
          active && 'bg-gold/12',
        )}>
        <span className="flex size-9 items-center justify-center rounded-full bg-gold text-lapis [&_svg]:size-4">
          <PlayGlyph playback={playback} />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-sm font-medium">{playLabel(t, playback)}</span>
          {reciterName && <span className="block text-xs text-muted-foreground">{reciterName}</span>}
        </span>
      </button>

      <ToggleControl
        pressed={focusMode}
        onClick={onToggleFocus}
        icon={<Focus />}
        label={t.focusMode}
        detail={focusMode ? t.focusOn : t.focusOff}
      />
      <ToggleControl
        pressed={latin}
        onClick={onToggleLatin}
        icon={<Languages />}
        label={t.latin}
        detail={latin ? t.latinOn : t.latinOff}
      />
    </div>
  );
}

/**
 * The same two actions, icon-only, for the running head.
 */
export function CompactSurahControls({
  playback,
  focusMode,
  latin,
  onTogglePlay,
  onToggleFocus,
  onToggleLatin,
}: SurahControlsProps) {
  const t = useT();
  const button =
    'flex size-8 items-center justify-center rounded-full ring-1 ring-gold/45 text-gold-ink transition-colors hover:bg-gold/15 focus-visible:outline-2 focus-visible:outline-gold [&_svg]:size-3.5';

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        title={playLabel(t, playback)}
        aria-label={playLabel(t, playback)}
        aria-pressed={playback !== 'idle'}
        onClick={onTogglePlay}
        className={cn(button, playback !== 'idle' && 'bg-gold text-lapis ring-0 hover:bg-gold/85')}>
        <PlayGlyph playback={playback} />
      </button>
      <button
        type="button"
        title={t.focusMode}
        aria-label={t.focusMode}
        aria-pressed={focusMode}
        onClick={onToggleFocus}
        className={cn(button, focusMode && 'bg-gold text-lapis ring-0 hover:bg-gold/85')}>
        <Focus />
      </button>
      <button
        type="button"
        title={t.latin}
        aria-label={t.latin}
        aria-pressed={latin}
        onClick={onToggleLatin}
        className={cn(button, latin && 'bg-gold text-lapis ring-0 hover:bg-gold/85')}>
        <Languages />
      </button>
    </div>
  );
}
