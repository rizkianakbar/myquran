/**
 * Geometry for the illumination ornaments: star polygons and rosettes in the
 * spirit of mushaf headpieces, generated so every surah gets its own.
 */

export interface Point {
  x: number;
  y: number;
}

function polar(cx: number, cy: number, r: number, angle: number): Point {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function toPath(points: Point[], closed = true): string {
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  return closed ? `${d} Z` : d;
}

/**
 * A star polygon {n/k}: n points on a circle, joined every k-th point.
 * {8/2} is the khatam (two overlapping squares); {8/3} the classic eight-point star.
 */
export function starPolygon(opts: {
  cx: number;
  cy: number;
  r: number;
  n: number;
  k: number;
  rotation?: number;
}): string {
  const { cx, cy, r, n, k, rotation = 0 } = opts;
  const paths: string[] = [];
  const cycles = gcd(n, k);
  for (let start = 0; start < cycles; start++) {
    const points: Point[] = [];
    for (let i = 0; i < n / cycles; i++) {
      points.push(polar(cx, cy, r, rotation - Math.PI / 2 + ((start + i * k) * 2 * Math.PI) / n));
    }
    paths.push(toPath(points));
  }
  return paths.join(' ');
}

/**
 * The outline of an n-point star with inner radius `inner` — a single closed
 * shape that can be filled, unlike the self-intersecting star polygon.
 */
export function starOutline(opts: {
  cx: number;
  cy: number;
  r: number;
  inner: number;
  n: number;
  rotation?: number;
}): string {
  const { cx, cy, r, inner, n, rotation = 0 } = opts;
  const points: Point[] = [];
  for (let i = 0; i < n * 2; i++) {
    points.push(polar(cx, cy, i % 2 === 0 ? r : inner, rotation - Math.PI / 2 + (i * Math.PI) / n));
  }
  return toPath(points);
}

/**
 * Petal-like lozenges radiating from the centre, used as a rosette's crown.
 */
export function petals(opts: {
  cx: number;
  cy: number;
  from: number;
  to: number;
  width: number;
  n: number;
  rotation?: number;
}): string {
  const { cx, cy, from, to, width, n, rotation = 0 } = opts;
  const mid = (from + to) / 2;
  const paths: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = rotation - Math.PI / 2 + (i * 2 * Math.PI) / n;
    const spread = width / mid;
    paths.push(
      toPath([
        polar(cx, cy, from, a),
        polar(cx, cy, mid, a - spread),
        polar(cx, cy, to, a),
        polar(cx, cy, mid, a + spread),
      ]),
    );
  }
  return paths.join(' ');
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export interface RosetteSpec {
  folds: number;
  step: number;
  rotation: number;
  rings: number;
}

const FOLDS = [8, 10, 12, 16, 8, 12];

/**
 * Deterministic per-surah variation, so a surah's headpiece is always the
 * same and neighbours always differ.
 */
export function rosetteFor(surah: number): RosetteSpec {
  const folds = FOLDS[surah % FOLDS.length];
  return {
    folds,
    step: folds >= 12 ? 5 : 3,
    rotation: ((surah * 37) % 360) * (Math.PI / 180) * (1 / folds),
    rings: 2 + (surah % 2),
  };
}
