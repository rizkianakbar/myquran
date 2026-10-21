import { Lattice } from '#/components/ornament/lattice.tsx';
import { Medallion } from '#/components/ornament/medallion.tsx';
import { useT } from '#/lib/i18n.ts';

/**
 * Dressing for the verse being recited: the star lattice behind it, and a
 * corner badge whose medallion turns and bars move while the verse sounds.
 */
export function RecitingOrnament({ playing }: { playing: boolean }) {
  const t = useT();

  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 animate-in overflow-hidden duration-500 fade-in">
        <Lattice className="opacity-80" />
      </span>
      <span className="absolute top-2.5 left-4 flex animate-in items-center gap-2 text-xs text-gold-ink duration-500 fade-in sm:left-6">
        <Medallion className="size-5" spinning={playing} />
        <span>{playing ? t.nowReciting : t.pausedLabel}</span>
        <span
          aria-hidden="true"
          data-paused={playing ? undefined : ''}
          className="recite-bars flex h-3 items-end gap-0.5">
          <span className="h-full w-0.5 rounded-full bg-gold" />
          <span className="h-full w-0.5 rounded-full bg-gold" />
          <span className="h-full w-0.5 rounded-full bg-gold" />
        </span>
      </span>
    </>
  );
}
