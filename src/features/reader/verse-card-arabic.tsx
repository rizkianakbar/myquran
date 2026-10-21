import { VerseMarker } from '#/components/ornament/headpiece.tsx';
import { toArabicNumber } from '#/lib/quran/data.ts';
import type { Verse } from '#/lib/quran/types.ts';
import { cn } from '#/lib/utils.ts';
import { reciteState } from './reader-recite.lib.ts';

export interface VerseArabicProps {
  verse: Verse;
  /**
   * Render each word as its own span (hover, selection, recitation). A far
   * card renders the same text flat, so swapping between them moves nothing.
   */
  interactive: boolean;
  recitedWord: number | null | undefined;
  selectedWords: { from: number; to: number } | null;
}

function PlainWords({ verse }: { verse: Verse }) {
  const leading = verse.words
    .slice(0, -1)
    .map((word) => `${word.a} `)
    .join('');

  return (
    <>
      {leading}
      <span className="whitespace-nowrap">
        {verse.words.at(-1)?.a} <VerseMarker n={toArabicNumber(verse.n)} />
      </span>
    </>
  );
}

function InteractiveWords({ verse, recitedWord, selectedWords }: Omit<VerseArabicProps, 'interactive'>) {
  return verse.words.map((word, i) => {
    const position = i + 1;
    const selected = selectedWords && position >= selectedWords.from && position <= selectedWords.to;
    const isLast = position === verse.words.length;
    const span = (
      <span
        key={position}
        data-word={position}
        data-recite={recitedWord === undefined ? undefined : reciteState(position, recitedWord)}
        className={cn(
          'cursor-pointer rounded-md transition-colors duration-100 [@media(hover:hover)]:hover:text-highlight-foreground',
          selected && 'bg-gold/20 text-gold-ink',
        )}>
        {word.a}
        {isLast ? '' : ' '}
      </span>
    );
    // The verse-end star must never wrap onto a line of its own.
    return isLast ? (
      <span key={position} className="whitespace-nowrap">
        {span} <VerseMarker n={toArabicNumber(verse.n)} />
      </span>
    ) : (
      span
    );
  });
}

/**
 * The verse's Arabic line. `recitedWord` is undefined unless this verse is
 * being recited, when it marks the karaoke position (null between words).
 */
export function VerseArabic({ verse, interactive, recitedWord, selectedWords }: VerseArabicProps) {
  return (
    <p
      dir="rtl"
      lang="ar"
      className={cn('font-arabic leading-[2.2] select-none', recitedWord !== undefined && 'reciting')}
      style={{ fontSize: 'var(--arabic-size)' }}>
      {interactive ? (
        <InteractiveWords verse={verse} recitedWord={recitedWord} selectedWords={selectedWords} />
      ) : (
        <PlainWords verse={verse} />
      )}
    </p>
  );
}
