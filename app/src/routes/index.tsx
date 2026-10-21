import { createFileRoute, Link } from '@tanstack/react-router';
import { starOutline } from '#app/src/components/ornament/geometry.ts';
import { Rosette } from '#app/src/components/ornament/rosette.tsx';
import { chapterTranslatedName, useT } from '#app/src/lib/i18n.ts';
import { usePrefs } from '#app/src/lib/prefs.ts';
import { useProgress } from '#app/src/lib/progress.ts';
import { getSurah, useChapters } from '#app/src/lib/quran/data.ts';
import type { Chapter } from '#app/src/lib/quran/types.ts';
import { cn } from '#assets/lib/utils.ts';

export const Route = createFileRoute('/')({
  component: HomePage,
});

const HERO_ROSETTE = { folds: 16, step: 5, rotation: 0, rings: 3 };

function Frontispiece() {
  const t = useT();
  const { lastRead } = useProgress();
  const { data: chapters = [], isError } = useChapters();
  const resume = lastRead ? chapters[lastRead.surah - 1] : undefined;

  return (
    <section className="dark relative overflow-hidden rounded-[2rem] bg-(--ornament-field) text-foreground ring-1 ring-gold/30">
      <div className="grid items-center gap-8 p-8 sm:p-12 md:grid-cols-[1fr_minmax(0,22rem)] md:gap-4">
        <div className="relative z-10 max-w-md">
          <p dir="rtl" lang="ar" className="text-left font-kufi text-5xl text-gold-ink sm:text-6xl">
            قُرْآنِي
          </p>
          <h1 className="mt-5 font-serif text-3xl leading-tight font-medium sm:text-4xl">{t.homeTagline}</h1>
          <p className="mt-4 font-serif text-base leading-relaxed text-(--muted-foreground)">{t.homeIntro}</p>

          {isError && <p className="mt-6 text-sm text-(--destructive)">{t.dataMissing}</p>}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {resume && lastRead ? (
              <Link
                to="/surah/$surah"
                params={{ surah: resume.number }}
                hash={`v${lastRead.verse}`}
                className="inline-flex h-11 items-center rounded-full bg-gold px-5 text-sm font-medium text-lapis transition-colors hover:bg-gold/85">
                {t.continueReading}: {resume.nameSimple}, {t.verseShort(lastRead.verse).toLowerCase()}
              </Link>
            ) : (
              <Link
                to="/surah/$surah"
                params={{ surah: 1 }}
                className="inline-flex h-11 items-center rounded-full bg-gold px-5 text-sm font-medium text-lapis transition-colors hover:bg-gold/85">
                {t.startReading}
              </Link>
            )}
            <a
              href="#index"
              className="text-sm text-(--muted-foreground) underline-offset-4 hover:text-gold-ink hover:underline">
              {t.allSurahs}
            </a>
          </div>
        </div>

        <svg viewBox="0 0 400 400" aria-hidden="true" className="headpiece mx-auto w-full max-w-[22rem] md:-my-6">
          <Rosette cx={200} cy={200} r={188} spec={HERO_ROSETTE} delay={150} />
          <Rosette cx={200} cy={200} r={74} spec={{ folds: 8, step: 3, rotation: Math.PI / 8, rings: 2 }} delay={600} />
        </svg>
      </div>
    </section>
  );
}

function IndexMarker({ n, done }: { n: number; done: boolean }) {
  return (
    <span className="relative inline-flex size-10 shrink-0 items-center justify-center">
      <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute inset-0 size-full">
        <path
          d={starOutline({ cx: 20, cy: 20, r: 19, inner: 15, n: 8 })}
          className={cn('stroke-gold', done ? 'fill-gold/25' : 'fill-none')}
          strokeWidth={1}
        />
      </svg>
      <span className="relative text-xs font-medium tabular-nums">{n}</span>
    </span>
  );
}

function IndexRow({ chapter, read }: { chapter: Chapter; read: number }) {
  const t = useT();
  const { language } = usePrefs();
  const pct = read / chapter.versesCount;

  return (
    <li>
      <Link
        to="/surah/$surah"
        params={{ surah: chapter.number }}
        onMouseEnter={() => void getSurah(chapter.number)}
        className="group flex items-center gap-4 border-b py-3 transition-colors hover:border-gold/50">
        <IndexMarker n={chapter.number} done={pct >= 1} />
        <span className="min-w-0 grow">
          <span className="block truncate font-serif text-[1.0625rem] group-hover:text-gold-ink">
            {chapter.nameSimple}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {chapterTranslatedName(chapter, language)}
            <span className="ml-2 opacity-70">{t.verses(chapter.versesCount)}</span>
          </span>
        </span>
        {read > 0 && pct < 1 && (
          <span
            className="h-1 w-10 shrink-0 overflow-hidden rounded-full bg-border"
            title={`${read}/${chapter.versesCount}`}>
            <span className="block h-full bg-gold" style={{ width: `${pct * 100}%` }} />
          </span>
        )}
        <span dir="rtl" lang="ar" className="w-24 shrink-0 text-right font-kufi text-xl text-gold-ink">
          {chapter.nameArabic}
        </span>
      </Link>
    </li>
  );
}

function HomePage() {
  const t = useT();
  const { furthest } = useProgress();
  const { data: chapters = [] } = useChapters();

  return (
    <main id="main-content" className="min-w-0 grow overflow-y-auto">
      <title>{t.appName}</title>
      <div className="mx-auto max-w-5xl px-4 pt-6 pb-40 sm:px-8 sm:pt-10">
        <Frontispiece />

        <section id="index" className="mt-16 scroll-mt-6">
          <h2 className="font-serif text-2xl">{t.allSurahs}</h2>
          <ul className="mt-4 grid gap-x-12 lg:grid-cols-2">
            {chapters.map((chapter) => (
              <IndexRow key={chapter.number} chapter={chapter} read={furthest[chapter.number] ?? 0} />
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
