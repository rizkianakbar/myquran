import { petals, type RosetteSpec, starOutline, starPolygon } from './geometry.ts';

/**
 * A layered geometric rosette drawn into an existing SVG at (cx, cy).
 * Strokes use `pathLength=1` so the `.draw` animation can trace them in.
 */
export function Rosette({
  cx,
  cy,
  r,
  spec,
  delay = 0,
}: {
  cx: number;
  cy: number;
  r: number;
  spec: RosetteSpec;
  delay?: number;
}) {
  const { folds, step, rotation, rings } = spec;
  const stagger = (i: number) => ({ animationDelay: `${delay + i * 90}ms` });

  return (
    <g>
      <circle cx={cx} cy={cy} r={r} className="fill-(--ornament-field)" />
      <path
        d={starOutline({ cx, cy, r: r * 0.92, inner: r * 0.62, n: folds, rotation })}
        className="ornament-fill fill-(--ornament-ground)"
        style={stagger(4)}
      />
      {Array.from({ length: rings }, (_, i) => (
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: rings are positional and never reorder
          key={i}
          cx={cx}
          cy={cy}
          r={r * (1 - i * 0.045)}
          pathLength={1}
          className="draw fill-none stroke-gold"
          strokeWidth={i === 0 ? 1.6 : 0.8}
          style={stagger(i)}
        />
      ))}
      <path
        d={starPolygon({ cx, cy, r: r * 0.92, n: folds, k: step, rotation })}
        pathLength={1}
        className="draw fill-none stroke-gold"
        strokeWidth={1.2}
        strokeLinejoin="round"
        style={stagger(2)}
      />
      <path
        d={petals({
          cx,
          cy,
          from: r * 0.2,
          to: r * 0.56,
          width: r * 0.07,
          n: folds,
          rotation: rotation + Math.PI / folds,
        })}
        pathLength={1}
        className="draw ornament-fill fill-gold/25 stroke-gold"
        strokeWidth={0.9}
        style={stagger(3)}
      />
      <path
        d={starOutline({ cx, cy, r: r * 0.24, inner: r * 0.15, n: folds / 2, rotation })}
        className="ornament-fill fill-gold"
        style={stagger(5)}
      />
      {Array.from({ length: folds }, (_, i) => {
        const a = rotation - Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / folds;
        return (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: dots are positional and never reorder
            key={i}
            cx={cx + r * 0.8 * Math.cos(a)}
            cy={cy + r * 0.8 * Math.sin(a)}
            r={r * 0.028}
            className="ornament-fill fill-gold"
            style={stagger(6)}
          />
        );
      })}
    </g>
  );
}
