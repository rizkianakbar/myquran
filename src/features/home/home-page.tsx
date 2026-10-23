import { useT } from '#/lib/i18n.ts';
import { useProgress } from '#/lib/progress.ts';
import { useChapters } from '#/lib/quran/data.ts';
import { HomeFrontispiece } from './home-frontispiece.tsx';
import { HomeIndexRow } from './home-index-row.tsx';
import { HomePlan } from './home-plan.tsx';
import { HomeVerseOfDay } from './home-verse-of-day.tsx';

export function HomePage() {
  const t = useT();
  const { furthest } = useProgress();
  const { data: chapters = [] } = useChapters();

  return (
    <main id="main-content" className="min-w-0 grow">
      <div className="mx-auto max-w-5xl px-4 pt-6 pb-40 sm:px-8 sm:pt-10">
        <HomeFrontispiece />
        <HomePlan />
        <HomeVerseOfDay />

        <section id="index" className="mt-14 scroll-mt-6">
          <h2 className="font-serif text-2xl">{t.allSurahs}</h2>
          <ul className="mt-4 grid grid-cols-1 gap-x-12 lg:grid-cols-2">
            {chapters.map((chapter) => (
              <HomeIndexRow key={chapter.number} chapter={chapter} read={furthest[chapter.number] ?? 0} />
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
