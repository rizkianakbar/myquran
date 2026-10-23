import { Link } from '@tanstack/react-router';
import { ArrowRight, Check } from 'lucide-react';
import { buttonVariants } from '#/components/ui/button.tsx';
import { useT } from '#/lib/i18n.ts';
import { useChapters } from '#/lib/quran/data.ts';
import { cn } from '#/lib/utils.ts';
import type { PlanSummary } from './plans.lib.ts';

export function PlanBar({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('block h-1 overflow-hidden rounded-full bg-border', className)}>
      <span className="block h-full bg-gold transition-[width]" style={{ width: `${Math.min(1, value) * 100}%` }} />
    </span>
  );
}

/**
 * Link to where the reader left off in today's portion.
 */
export function PlanContinue({ summary, className }: { summary: PlanSummary; className?: string }) {
  const t = useT();
  const chapter = useChapters().data?.[(summary.next?.surah ?? 1) - 1];
  if (!summary.next) return null;
  const { surah, verse } = summary.next;
  const done = summary.portionRead >= summary.portionPages;

  return (
    <Link
      to="/surah/$surah"
      params={{ surah }}
      hash={`v${verse}`}
      className={cn(buttonVariants({ variant: done ? 'outline' : 'default', size: 'lg' }), 'px-3.5', className)}>
      {t.planContinue}
      <span className="font-normal opacity-75">
        {chapter?.nameSimple} <span className="tabular-nums">{`${surah}:${verse}`}</span>
      </span>
      <ArrowRight data-icon="inline-end" />
    </Link>
  );
}

/**
 * Today's pages and how far into them the reader is.
 */
export function PlanPortion({ summary }: { summary: PlanSummary }) {
  const t = useT();
  const { portion, portionRead, portionPages } = summary;
  if (!portion) return null;
  const done = portionRead >= portionPages;

  return (
    <div>
      <div className="font-serif text-xl">{t.planPages(portion.fromPage, portion.toPage)}</div>
      <PlanBar value={portionRead / portionPages} className="mt-2.5" />
      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
        {done ? (
          <>
            <Check className="size-3.5 text-gold-ink" />
            {t.planTodayDone}
          </>
        ) : (
          t.planPortionRead(portionRead, portionPages)
        )}
      </div>
    </div>
  );
}
