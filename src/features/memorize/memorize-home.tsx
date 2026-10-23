import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { ChoiceSelect } from '#/components/choice-select.tsx';
import { Button, buttonVariants } from '#/components/ui/button.tsx';
import { Field, FieldGroup, FieldLabel } from '#/components/ui/field.tsx';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { dateKey } from '#/lib/progress.ts';
import type { Chapter } from '#/lib/quran/types.ts';
import { cn } from '#/lib/utils.ts';
import { daysUntilDue, duePassages, nextPassage, passageId, passageLabel } from './memorize.lib.ts';
import { memorizeStore } from './memorize.store.ts';
import type { PracticeRange } from './memorize.types.ts';

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-3 text-xs font-medium tracking-[0.16em] text-gold-ink uppercase">{children}</h2>;
}

/**
 * Choose a passage to learn: a surah, and the verses within it.
 */
function PassagePicker({ chapters, initial }: { chapters: Chapter[]; initial: PracticeRange }) {
  const t = useT();
  const navigate = useNavigate();
  const [range, setRange] = useState(initial);
  const count = chapters[range.surah - 1]?.versesCount ?? 1;
  const verses = Array.from({ length: count }, (_, i) => ({ value: i + 1, label: String(i + 1) }));

  return (
    <form
      className="rounded-2xl border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void navigate({ to: '/memorize', search: range });
      }}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="memorize-surah">{t.memorizeSurah}</FieldLabel>
          <ChoiceSelect
            id="memorize-surah"
            value={range.surah}
            onChange={(surah) => setRange({ surah, from: 1, to: Math.min(chapters[surah - 1]?.versesCount ?? 1, 5) })}
            options={chapters.map((c) => ({ value: c.number, label: `${c.number}. ${c.nameSimple}` }))}
            className="w-full"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="memorize-from">{t.memorizeFrom}</FieldLabel>
            <ChoiceSelect
              id="memorize-from"
              value={range.from}
              onChange={(from) => setRange((prev) => ({ ...prev, from, to: Math.max(prev.to, from) }))}
              options={verses}
              className="w-full min-w-0"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="memorize-to">{t.memorizeTo}</FieldLabel>
            <ChoiceSelect
              id="memorize-to"
              value={range.to}
              onChange={(to) => setRange((prev) => ({ ...prev, to }))}
              options={verses.filter((v) => v.value >= range.from)}
              className="w-full min-w-0"
            />
          </Field>
        </div>
        <Button type="submit" size="lg" className="h-11 w-full rounded-full">
          {t.memorizeStart}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </FieldGroup>
    </form>
  );
}

/**
 * The Memorize home: what's due for review first (reviewing is what makes
 * it stay), then the passage in progress, a new one, and all that's memorized.
 */
export function MemorizeHome({ chapters }: { chapters: Chapter[] }) {
  const t = useT();
  const { language } = usePrefs();
  const { learning, passages } = memorizeStore.use();
  const today = dateKey(new Date());
  const due = duePassages(passages, today);
  const relative = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  const name = (range: PracticeRange) => passageLabel(chapters[range.surah - 1]?.nameSimple, range);
  // What's in progress, else what follows the passage memorized last, else a
  // short surah from Juz 'Amma, where most people start.
  const latest = passages.reduce<(typeof passages)[number] | undefined>(
    (last, p) => (!last || p.learned > last.learned ? p : last),
    undefined,
  );
  const suggestion = learning?.range ??
    (latest && nextPassage(latest, (n) => chapters[n - 1]?.versesCount)) ?? { surah: 112, from: 1, to: 4 };

  return (
    <div className="space-y-9">
      <p className="text-sm text-muted-foreground">{t.memorizeIntro}</p>

      {due.length > 0 && (
        <section>
          <SectionTitle>{t.reviewDue}</SectionTitle>
          <ul className="space-y-2">
            {due.map((passage) => (
              <li key={passageId(passage)}>
                <Link
                  to="/memorize"
                  search={{ surah: passage.surah, from: passage.from, to: passage.to, mode: 'review' }}
                  className="pressable flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/8 px-4 py-3.5 hover:bg-gold/12">
                  <span className="flex size-9 items-center justify-center rounded-full bg-gold text-lapis [&_svg]:size-4">
                    <RotateCcw />
                  </span>
                  <span className="grow font-serif text-lg">{name(passage)}</span>
                  <span className="text-sm font-medium text-gold-ink">{t.reviewNow}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {learning && (
        <section>
          <SectionTitle>{t.continueLearning}</SectionTitle>
          <Link
            to="/memorize"
            search={learning.range}
            className="pressable block rounded-2xl border bg-card px-5 py-4 hover:border-gold/50">
            <span className="flex items-center gap-3">
              <span className="grow font-serif text-lg">{name(learning.range)}</span>
              <ArrowRight className="size-4 text-gold-ink" />
            </span>
            <span className="mt-3 block h-1 overflow-hidden rounded-full bg-border">
              <span
                className="block h-full bg-gold"
                style={{
                  width: `${(learning.learned.length / (learning.range.to - learning.range.from + 1)) * 100}%`,
                }}
              />
            </span>
            <span className="mt-1.5 block text-xs text-muted-foreground tabular-nums">
              {t.versesLearned(learning.learned.length, learning.range.to - learning.range.from + 1)}
            </span>
          </Link>
        </section>
      )}

      <section>
        <SectionTitle>{t.memorizeNew}</SectionTitle>
        <PassagePicker chapters={chapters} initial={suggestion} />
      </section>

      {passages.length > 0 && (
        <section>
          <SectionTitle>{t.memorizedPassages}</SectionTitle>
          <ul className="divide-y rounded-2xl border bg-card">
            {[...passages]
              .sort((a, b) => a.surah - b.surah || a.from - b.from)
              .map((passage) => (
                <li key={passageId(passage)}>
                  <Link
                    to="/memorize"
                    search={{ surah: passage.surah, from: passage.from, to: passage.to, mode: 'review' }}
                    className={cn(
                      buttonVariants({ variant: 'ghost' }),
                      'h-auto w-full justify-between rounded-none px-4 py-3 first:rounded-t-2xl last:rounded-b-2xl',
                    )}>
                    <span className="font-serif text-base font-normal">{name(passage)}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {t.nextReview(relative.format(daysUntilDue(passage, today), 'day'))}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
