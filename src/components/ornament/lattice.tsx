import { useId } from 'react';
import { cn } from '#/lib/utils.ts';
import { starOutline } from './geometry.ts';

/**
 * A faint field of eight-point stars, the ground of illuminated bands.
 * Fills its positioned parent.
 */
export function Lattice({ className, size = 28 }: { className?: string; size?: number }) {
  const id = useId().replace(/:/g, '');
  const half = size / 2;

  return (
    <svg aria-hidden="true" className={cn('pointer-events-none absolute inset-0 size-full', className)}>
      <defs>
        <pattern id={`lattice-${id}`} width={size} height={size} patternUnits="userSpaceOnUse">
          <path
            d={starOutline({ cx: half, cy: half, r: size * 0.32, inner: size * 0.21, n: 8, rotation: Math.PI / 8 })}
            className="fill-none stroke-gold/25"
            strokeWidth={0.7}
          />
          <circle cx="0" cy="0" r="1.2" className="fill-gold/30" />
          <circle cx={size} cy="0" r="1.2" className="fill-gold/30" />
          <circle cx="0" cy={size} r="1.2" className="fill-gold/30" />
          <circle cx={size} cy={size} r="1.2" className="fill-gold/30" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#lattice-${id})`} />
    </svg>
  );
}
