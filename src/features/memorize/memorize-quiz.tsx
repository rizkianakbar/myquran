import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { VerseMarker } from '#/components/ornament/headpiece.tsx';
import { useT } from '#/lib/i18n.ts';
import { toArabicNumber } from '#/lib/quran/data.ts';
import type { Verse } from '#/lib/quran/types.ts';
import { cn } from '#/lib/utils.ts';
import { quizBlanks, quizChoices } from './memorize.lib.ts';

export interface MemorizeQuizProps {
  verse: Verse;
  /**
   * Words of the surah, where the wrong choices come from.
   */
  pool: string[];
  onDone: () => void;
}

/**
 * Fill the gaps: a few words of the verse are blank, filled one at a time
 * (in reading order) by picking the right word from four. A right pick drops
 * into place in gold; a wrong one shakes, turns red and is struck out, and
 * the reader tries again.
 */
export function MemorizeQuiz({ verse, pool, onDone }: MemorizeQuizProps) {
  const t = useT();
  const blanks = useMemo(() => quizBlanks(verse.key, verse.words.length), [verse]);
  const [filled, setFilled] = useState(0);
  const [wrong, setWrong] = useState<ReadonlySet<string>>(new Set());
  const done = filled >= blanks.length;
  const current = blanks[filled];
  const correct = current ? verse.words[current - 1].a : '';
  const choices = useMemo(
    () => (current ? quizChoices(correct, pool, `${verse.key}:${current}`) : []),
    [correct, current, pool, verse.key],
  );

  const pick = (word: string) => {
    if (word === correct) {
      navigator.vibrate?.(12);
      setWrong(new Set());
      setFilled((n) => n + 1);
      if (filled + 1 >= blanks.length) onDone();
    } else {
      navigator.vibrate?.([30, 40, 30]);
      setWrong((prev) => new Set(prev).add(word));
    }
  };

  return (
    <div className="space-y-6">
      <p
        dir="rtl"
        lang="ar"
        className="font-arabic leading-[2.4] select-none"
        style={{ fontSize: 'calc(var(--arabic-size) * 1.15)' }}>
        {verse.words.map((word, i) => {
          const position = i + 1;
          const blank = blanks.indexOf(position);
          const space = position < verse.words.length ? ' ' : '';
          if (blank === -1 || blank < filled) {
            return (
              <span key={position}>
                <span className={cn(blank !== -1 && 'animate-in text-gold-ink duration-300 zoom-in-90')}>{word.a}</span>
                {space}
              </span>
            );
          }
          return (
            <span key={position}>
              {/* An empty slot about as wide as the word, the one to fill now ringed in gold. */}
              <span
                className={cn(
                  'inline-block h-[1.1em] min-w-[2.5em] translate-y-[0.15em] rounded-lg border-2 border-dashed align-baseline transition-colors',
                  blank === filled ? 'border-gold bg-gold/10' : 'border-border',
                )}
                style={{ width: `${Math.max(2.5, word.a.length * 0.42)}em` }}
              />
              {space}
            </span>
          );
        })}{' '}
        <VerseMarker n={toArabicNumber(verse.n)} />
      </p>

      {done ? (
        <p
          role="status"
          className="flex animate-in items-center justify-center gap-2 text-sm font-medium text-gold-ink duration-300 fade-in zoom-in-95">
          <Check className="size-4" />
          {t.quizDone}
        </p>
      ) : (
        <div>
          <p className="mb-2 text-center text-xs text-muted-foreground tabular-nums">
            {t.quizProgress(filled + 1, blanks.length)}
          </p>
          <fieldset className="grid grid-cols-2 gap-2.5">
            <legend className="sr-only">{t.quizChoose}</legend>
            {choices.map((word) => {
              const isWrong = wrong.has(word);
              return (
                <button
                  key={`${current}-${word}`}
                  type="button"
                  disabled={isWrong}
                  onClick={() => pick(word)}
                  className={cn(
                    'pressable flex h-16 items-center justify-center rounded-2xl border bg-background px-3 font-arabic text-2xl hover:border-gold/60 hover:bg-gold/5',
                    isWrong &&
                      'quiz-shake border-destructive/50 bg-destructive/5 text-destructive line-through opacity-70',
                  )}>
                  <span dir="rtl" lang="ar">
                    {word}
                  </span>
                </button>
              );
            })}
          </fieldset>
        </div>
      )}
    </div>
  );
}
