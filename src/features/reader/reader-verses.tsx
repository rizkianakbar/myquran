import { Fragment, useMemo } from 'react';
import { JuzMarker, VerseDivider } from '#/components/ornament/dividers.tsx';
import { usePlayer } from '#/features/audio/audio.hooks.ts';
import type { PlayerState } from '#/features/audio/audio.lib.ts';
import { resolveLatin, resolveTranslation, usePrefs } from '#/lib/prefs.ts';
import type { Chapter, SurahData, Verse } from '#/lib/quran/types.ts';
import { groupPages } from './mushaf.lib.ts';
import { MushafSheet } from './mushaf-sheet.tsx';
import type { WordSelection } from './reader-word-popover.tsx';
import { VerseCard, type VerseCardProps } from './verse-card.tsx';

/**
 * Between two verses: a juz' cartouche where a new juz' begins, a divider
 * carrying the page number where a new mushaf page begins, else a plain one.
 */
function VerseSeparator({ verse, previous }: { verse: Verse; previous: Verse }) {
  if (verse.juz !== previous.juz) return <JuzMarker juz={verse.juz} />;
  return <VerseDivider page={verse.page !== previous.page ? verse.page : undefined} />;
}

/**
 * Only the recited verse gets recitation props, so the others stay equal
 * and `memo` skips them on every word tick.
 */
function recitationFor(player: PlayerState, surah: number, verse: number): VerseCardProps['recitation'] {
  if (player.surah !== surah || player.verse !== verse) return null;
  return { word: player.word, playing: player.playing, loading: player.loading };
}

function MushafView({ surahData, chapter }: { surahData: SurahData; chapter: Chapter }) {
  const player = usePlayer();
  const pages = useMemo(() => groupPages(surahData), [surahData]);
  const recitation =
    player.surah === surahData.surah ? { verse: player.verse, word: player.word } : { verse: null, word: null };

  return (
    <div className="-mx-2 flex animate-in flex-col gap-7 py-4 duration-300 fade-in sm:mx-0">
      {pages.map((page) => (
        <MushafSheet key={page.page} page={page} chapter={chapter} recitation={recitation} />
      ))}
    </div>
  );
}

export interface ReaderVersesProps {
  surahData: SurahData;
  chapter: Chapter | undefined;
  selection: WordSelection | null;
  signedIn: boolean;
  noteByVerse: Map<number, string>;
  bookmarkedVerses: Set<number>;
  onToggleBookmark: (verse: number) => void;
}

/**
 * The surah's verses: cards, or the mushaf pages in focus mode. Keyed by
 * surah by the caller, so each surah fades in fresh.
 */
export function ReaderVerses({
  surahData,
  chapter,
  selection,
  signedIn,
  noteByVerse,
  bookmarkedVerses,
  onToggleBookmark,
}: ReaderVersesProps) {
  const prefs = usePrefs();
  const player = usePlayer();
  const surah = surahData.surah;

  if (prefs.focusMode && chapter) return <MushafView surahData={surahData} chapter={chapter} />;

  const translation = resolveTranslation(prefs);
  return (
    <div className="animate-in duration-300 fade-in">
      {surahData.verses.map((verse, i) => (
        <Fragment key={verse.key}>
          {i > 0 && <VerseSeparator verse={verse} previous={surahData.verses[i - 1]} />}
          <VerseCard
            surah={surah}
            verse={verse}
            translation={translation}
            latin={resolveLatin(prefs, verse)}
            recitation={recitationFor(player, surah, verse.n)}
            selectedWords={
              selection?.verse === verse && selection.pinned ? { from: selection.word, to: selection.word } : null
            }
            bookmarked={bookmarkedVerses.has(verse.n)}
            note={noteByVerse.get(verse.n) ?? null}
            signedIn={signedIn}
            onToggleBookmark={onToggleBookmark}
          />
        </Fragment>
      ))}
    </div>
  );
}
