import { Link } from '@tanstack/react-router';
import { BookCheck, Brain, Clock, Compass } from 'lucide-react';
import type { ReactNode } from 'react';
import { duePassages, passageLabel } from '#/features/memorize/memorize.lib.ts';
import { memorizeStore } from '#/features/memorize/memorize.store.ts';
import { usePlan } from '#/features/plans/plans.hooks.ts';
import { usePrayerDay } from '#/features/prayer/prayer.hooks.ts';
import { compassPoint, qiblaBearing } from '#/features/prayer/prayer.lib.ts';
import { useT } from '#/lib/i18n.ts';
import { toggleDock, usePrefs } from '#/lib/prefs.ts';
import { dateKey } from '#/lib/progress.ts';
import { useChapters } from '#/lib/quran/data.ts';

const tile =
  'pressable group flex min-w-0 flex-col items-center gap-2 rounded-2xl border bg-card px-2 py-4 text-center hover:border-gold/50 focus-visible:outline-2 focus-visible:outline-gold';

function TileBody({ icon, label, detail }: { icon: ReactNode; label: string; detail: string }) {
  return (
    <>
      <span className="flex size-11 items-center justify-center rounded-full bg-gold/12 text-gold-ink ring-1 ring-gold/25 transition-colors group-hover:bg-gold/20 [&_svg]:size-5">
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
      <span className="w-full truncate text-xs text-muted-foreground tabular-nums">{detail}</span>
    </>
  );
}

/**
 * The app's daily tools, like a phone app's home: one tile each, with the
 * one thing worth knowing at a glance. New tools add a tile here.
 */
export function HomeTools() {
  const t = useT();
  const { language } = usePrefs();
  const { plan, summary } = usePlan();
  const { place, day } = usePrayerDay();

  const planDetail =
    plan && summary?.portion
      ? t.planPages(summary.portion.fromPage, summary.portion.toPage)
      : plan?.completedAt
        ? t.planComplete
        : t.planStartShort;
  const prayerDetail =
    place && day
      ? `${t.prayerNames[day.next.name]} ${new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit', timeZone: place.timezone }).format(day.next.at)}`
      : t.setLocation;
  const bearing = place ? qiblaBearing(place) : null;
  const { learning, passages } = memorizeStore.use();
  const dueCount = duePassages(passages, dateKey(new Date())).length;
  const chapters = useChapters().data;

  return (
    <nav aria-label={t.tools} className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
      <button type="button" onClick={() => toggleDock('journal')} className={tile}>
        <TileBody icon={<BookCheck />} label={t.readingPlan} detail={planDetail} />
      </button>
      <Link to="/prayer-times" className={tile}>
        <TileBody icon={<Clock />} label={t.prayerTimes} detail={prayerDetail} />
      </Link>
      <Link to="/memorize" search={{}} className={tile}>
        <TileBody
          icon={<Brain />}
          label={t.memorize}
          detail={
            dueCount > 0
              ? t.dueCount(dueCount)
              : learning
                ? passageLabel(chapters?.[learning.range.surah - 1]?.nameSimple, learning.range)
                : t.memorizeStartShort
          }
        />
      </Link>
      <Link to="/qibla" className={tile}>
        <TileBody
          icon={<Compass />}
          label={t.qibla}
          detail={bearing === null ? t.setLocation : `${Math.round(bearing)}° ${compassPoint(bearing)}`}
        />
      </Link>
    </nav>
  );
}
