import { useEffect, useState } from 'react';

/**
 * The part of the layout viewport the reader can actually see, as distances
 * from its bottom edge: `bottom` is what the on-screen keyboard covers, and
 * `height` is what is left above it. iOS keeps the layout viewport full height
 * when the keyboard opens and scrolls it instead, so `100dvh` and `bottom: 0`
 * land under the keyboard or off the top of the screen.
 */
export function useVisualViewport(enabled: boolean): { bottom: number; height: number } | null {
  const [area, setArea] = useState<{ bottom: number; height: number } | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!enabled || !vv) return setArea(null);
    const update = () => {
      const bottom = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setArea((prev) =>
        prev && prev.bottom === bottom && prev.height === vv.height ? prev : { bottom, height: vv.height },
      );
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [enabled]);

  return area;
}
