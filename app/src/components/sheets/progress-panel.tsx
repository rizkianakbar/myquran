import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useT } from '#app/src/lib/i18n.ts';
import { usePrefs } from '#app/src/lib/prefs.ts';
import { computeStreak, dateKey, lastNDays, useProgress } from '#app/src/lib/progress.ts';
import { useChapters } from '#app/src/lib/quran/data.ts';

const TOTAL_VERSES = 6236;

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function ProgressStats() {
  const t = useT();
  const { language } = usePrefs();
  const { activity, furthest } = useProgress();
  const { data: chapters = [] } = useChapters();

  const stats = useMemo(() => {
    const versesRead = Object.values(furthest).reduce((sum, n) => sum + n, 0);
    const completed = chapters.filter((c) => (furthest[c.number] ?? 0) >= c.versesCount).length;
    return {
      streak: computeStreak(activity),
      today: activity[dateKey(new Date())]?.length ?? 0,
      completed,
      pct: Math.min(100, (versesRead / TOTAL_VERSES) * 100),
    };
  }, [activity, furthest, chapters]);

  const days = lastNDays(14);
  const max = Math.max(1, ...days.map((d) => activity[d.key]?.length ?? 0));
  const weekday = new Intl.DateTimeFormat(language, { weekday: 'narrow' });
  const longDate = new Intl.DateTimeFormat(language, { dateStyle: 'medium' });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <Stat value={stats.streak} label={t.streak} />
        <Stat value={stats.today} label={t.versesToday} />
        <Stat value={stats.completed} label={t.surahsCompleted} />
        <Stat value={`${stats.pct.toFixed(stats.pct < 10 ? 1 : 0)}%`} label={t.quranRead} />
      </div>

      <section>
        <h3 className="mb-2 text-xs font-medium text-muted-foreground">{t.last14Days}</h3>
        <div className="flex h-24 items-end gap-1" role="img" aria-label={t.last14Days}>
          {days.map((d) => {
            const count = activity[d.key]?.length ?? 0;
            return (
              <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div
                  title={`${longDate.format(d.date)}: ${count}`}
                  className="w-full rounded-sm bg-gold"
                  style={{ height: count ? `${Math.max(6, (count / max) * 100)}%` : '2px', opacity: count ? 1 : 0.25 }}
                />
                <span className="text-[10px] text-muted-foreground">{weekday.format(d.date)}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function InProgressList() {
  const t = useT();
  const { furthest } = useProgress();
  const { data: chapters = [] } = useChapters();
  const started = chapters.filter((c) => {
    const read = furthest[c.number] ?? 0;
    return read > 0 && read < c.versesCount;
  });

  if (started.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 text-xs font-medium text-muted-foreground">{t.inProgress}</h3>
      <ul className="space-y-1">
        {started.map((c) => {
          const read = furthest[c.number] ?? 0;
          return (
            <li key={c.number}>
              <Link
                to="/surah/$surah"
                params={{ surah: c.number }}
                hash={`v${read}`}
                className="block rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                <span className="flex justify-between gap-2">
                  <span className="truncate">{c.nameSimple}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {read}/{c.versesCount}
                  </span>
                </span>
                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-border">
                  <span className="block h-full bg-gold" style={{ width: `${(read / c.versesCount) * 100}%` }} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Progress column of the journal; the journal supplies the heading and scroll area.
 */
export function ProgressPanel() {
  const t = useT();
  const { activity } = useProgress();

  if (Object.keys(activity).length === 0) {
    return <p className="text-sm text-muted-foreground">{t.progressEmpty}</p>;
  }
  return (
    <>
      <ProgressStats />
      <InProgressList />
    </>
  );
}
