import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { VerseDivider } from '#/components/ornament/dividers.tsx';
import { VerseMarker } from '#/components/ornament/headpiece.tsx';
import { useReaderFontsReady } from '#/hooks/use-reader-fonts-ready.ts';
import { useT } from '#/lib/i18n.ts';
import { resolveTranslation, usePrefs } from '#/lib/prefs.ts';
import { toArabicNumber, useChapters, useSurah } from '#/lib/quran/data.ts';
import { cn } from '#/lib/utils.ts';
import { verseOfTheDay } from './home.lib.ts';

export function HomeVerseOfDay() {
  const t = useT();
  const prefs = usePrefs();
  const { surah, verse: n } = verseOfTheDay(new Date());
  const verse = useSurah(surah)?.verses[n - 1];
  const chapter = useChapters().data?.[surah - 1];
  const translation = resolveTranslation(prefs) ?? prefs.language;
  const fontsReady = useReaderFontsReady(prefs.arabicFont);

  return (
    // An epigraph, not a card: hairlines and centred text keep it quieter than the frontispiece above.
    <section aria-labelledby="verse-of-day" className="mx-auto mt-14 max-w-3xl text-center">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="h-px grow bg-linear-to-r from-transparent via-gold/35 to-gold/50" />
        <h2 id="verse-of-day" className="text-xs font-medium tracking-[0.18em] text-gold-ink uppercase">
          {t.verseOfTheDay}
        </h2>
        <span aria-hidden="true" className="h-px grow bg-linear-to-l from-transparent via-gold/35 to-gold/50" />
      </div>

      {/* Empty until the verse and its font are both in, then one fade: no placeholder or font swap flashing. */}
      <div
        className={cn('min-h-48 transition-opacity duration-500', verse && fontsReady ? 'opacity-100' : 'opacity-0')}>
        {verse && (
          <>
            <p
              dir="rtl"
              lang="ar"
              className="mt-8 font-arabic leading-[2.2]"
              style={{ fontSize: 'min(var(--arabic-size), 2.25rem)' }}>
              {verse.arabic} <VerseMarker n={toArabicNumber(n)} />
            </p>
            <p className="mx-auto mt-4 max-w-[60ch] font-serif text-[1.0625rem] leading-[1.75] text-foreground/75">
              {verse[translation]}
            </p>
          </>
        )}
      </div>

      <Link
        to="/surah/$surah"
        params={{ surah }}
        hash={`v${n}`}
        className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-gold-ink hover:underline [&_svg]:size-4">
        <span>
          {chapter?.nameSimple} <span className="text-gold-ink tabular-nums">{`${surah}:${n}`}</span>
        </span>
        <span aria-hidden="true">·</span>
        {t.readInContext}
        <ArrowRight />
      </Link>

      <div className="mt-8">
        <VerseDivider />
      </div>
    </section>
  );
}
