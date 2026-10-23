import { useEffect, useState } from 'react';
import { loadReaderFonts, readerFontsReady } from '#/lib/fonts.ts';
import type { ArabicFont } from '#/lib/prefs.ts';

/**
 * True once the reader's fonts have loaded; synchronously true on later pages.
 */
export function useReaderFontsReady(font: ArabicFont): boolean {
  const [loaded, setLoaded] = useState(() => readerFontsReady(font));

  useEffect(() => {
    let cancelled = false;
    void loadReaderFonts(font).then(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [font]);

  return loaded || readerFontsReady(font);
}
