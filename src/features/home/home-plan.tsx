import { usePlan } from '#/features/plans/plans.hooks.ts';
import { PlanContinue, PlanPortion } from '#/features/plans/plans-portion.tsx';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';

/**
 * Today's reading from the reader's plan, when one is running. Quieter than
 * the frontispiece: a hairline panel, hidden from Settings if unwanted.
 */
export function HomePlan() {
  const t = useT();
  const { planOnHome } = usePrefs();
  const { plan, summary } = usePlan();
  if (!planOnHome || !plan || plan.completedAt || !summary?.portion) return null;

  return (
    <section
      aria-labelledby="todays-reading"
      className="mx-auto mt-10 flex max-w-3xl flex-col gap-4 rounded-xl border border-gold/30 px-5 py-4 sm:flex-row sm:items-center sm:gap-8">
      <div className="min-w-0 grow">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="todays-reading" className="text-xs font-medium tracking-[0.18em] text-gold-ink uppercase">
            {t.todaysReading}
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {t.planDayOf(Math.min(summary.day, summary.totalDays), summary.totalDays)}
          </span>
        </div>
        <div className="mt-2">
          <PlanPortion summary={summary} />
        </div>
      </div>
      <PlanContinue summary={summary} className="sm:self-center" />
    </section>
  );
}
