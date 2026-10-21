import { cn } from '#assets/lib/utils.ts';
import { starOutline, starPolygon } from './geometry.ts';

/**
 * The app's mark: a sixteen-point star around an eight-point khatam,
 * lapis-filled and gilt. It sits raised at the centre of the dock.
 */
export function Medallion({ className, spinning = false }: { className?: string; spinning?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={cn('overflow-visible', className)}>
      <g
        className={cn(
          'origin-center transition-transform duration-700 ease-[cubic-bezier(0.34,1.4,0.64,1)] group-hover:rotate-[22.5deg]',
          spinning && 'animate-[spin_14s_linear_infinite]',
        )}>
        <path
          d={starOutline({ cx: 50, cy: 50, r: 49, inner: 41, n: 16 })}
          className="fill-(--ornament-field) stroke-gold"
          strokeWidth={1.6}
        />
        <circle cx="50" cy="50" r="36" className="fill-(--ornament-ground) stroke-gold/60" strokeWidth={0.8} />
        <path
          d={starPolygon({ cx: 50, cy: 50, r: 33, n: 8, k: 3 })}
          className="fill-none stroke-gold"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
        <path
          d={starOutline({ cx: 50, cy: 50, r: 15, inner: 10, n: 8, rotation: Math.PI / 8 })}
          className="fill-gold"
        />
        <circle cx="50" cy="50" r="4" className="fill-(--ornament-field)" />
      </g>
    </svg>
  );
}
