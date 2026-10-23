import { Link } from '@tanstack/react-router';
import { Rosette } from '#/components/ornament/rosette.tsx';
import { useT } from '#/lib/i18n.ts';
import { useProgress } from '#/lib/progress.ts';
import { useChapters } from '#/lib/quran/data.ts';

const HERO_ROSETTE = { folds: 16, step: 5, rotation: 0, rings: 3 };

export function HomeFrontispiece() {
  const t = useT();
  const { lastRead } = useProgress();
  const { data: chapters = [], isError } = useChapters();
  const resume = lastRead ? chapters[lastRead.surah - 1] : undefined;

  return (
    <section className="dark relative overflow-hidden rounded-[2rem] bg-(--ornament-field) text-foreground ring-1 ring-gold/30">
      <div className="grid items-center gap-8 p-6 sm:p-12 md:grid-cols-[1fr_minmax(0,22rem)] md:gap-4">
        <div className="relative z-10 max-w-md">
          <p dir="rtl" lang="ar" className="text-left font-kufi text-4xl text-gold-ink sm:text-6xl">
            نُورِيش
          </p>
          <h1 className="mt-3 font-serif text-2xl leading-tight font-medium sm:mt-5 sm:text-4xl">{t.homeTagline}</h1>
          <p className="mt-3 font-serif text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
            {t.homeIntro}
          </p>

          {isError && <p className="mt-6 text-sm text-destructive">{t.dataMissing}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
            {resume && lastRead ? (
              <Link
                to="/surah/$surah"
                params={{ surah: resume.number }}
                hash={`v${lastRead.verse}`}
                className="pressable inline-flex h-11 items-center rounded-full bg-gold px-5 text-sm font-medium text-lapis hover:bg-gold/85">
                {t.continueReading}: {resume.nameSimple}, {t.verseShort(lastRead.verse).toLowerCase()}
              </Link>
            ) : (
              <Link
                to="/surah/$surah"
                params={{ surah: 1 }}
                className="pressable inline-flex h-11 items-center rounded-full bg-gold px-5 text-sm font-medium text-lapis hover:bg-gold/85">
                {t.startReading}
              </Link>
            )}
            <a
              href="#index"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-gold-ink hover:underline">
              {t.allSurahs}
            </a>
          </div>
        </div>

        {/* Phones: the rosette tucks into the corner behind the title instead of stacking a screen-wide one below. */}
        <svg
          viewBox="0 0 400 400"
          aria-hidden="true"
          className="headpiece pointer-events-none absolute -top-10 -right-10 size-44 opacity-60 md:hidden">
          <Rosette cx={200} cy={200} r={188} spec={HERO_ROSETTE} delay={150} />
        </svg>
        <svg
          viewBox="0 0 400 400"
          aria-hidden="true"
          className="headpiece mx-auto hidden w-full max-w-88 md:-my-6 md:block">
          <Rosette cx={200} cy={200} r={188} spec={HERO_ROSETTE} delay={150} />
          <Rosette cx={200} cy={200} r={74} spec={{ folds: 8, step: 3, rotation: Math.PI / 8, rings: 2 }} delay={600} />
        </svg>
      </div>
    </section>
  );
}
