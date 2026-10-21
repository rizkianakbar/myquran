import { Link } from '@tanstack/react-router';
import {
  Bookmark,
  BookOpenText,
  Check,
  Ellipsis,
  Link2,
  ListVideo,
  Loader2,
  NotebookPen,
  Pause,
  Play,
} from 'lucide-react';
import { type KeyboardEvent, memo, useState } from 'react';
import { useT } from '#app/src/lib/i18n.ts';
import { play, toggleVerse } from '#app/src/lib/player.ts';
import type { Language } from '#app/src/lib/prefs.ts';
import { toArabicNumber } from '#app/src/lib/quran/data.ts';
import type { Verse } from '#app/src/lib/quran/types.ts';
import { Button } from '#assets/components/ui/button.tsx';
import { Drawer, DrawerContent, DrawerTitle } from '#assets/components/ui/drawer.tsx';
import { cn } from '#assets/lib/utils.ts';
import { VerseMarker } from '../ornament/headpiece.tsx';
import { Lattice } from '../ornament/lattice.tsx';
import { isSajdah, MarginMarker, SajdahNote } from '../ornament/marginalia.tsx';
import { Medallion } from '../ornament/medallion.tsx';
import { NoteEditor } from './note-editor.tsx';
import { reciteState } from './recite.ts';
import { TafsirPanel } from './tafsir-panel.tsx';

export interface VerseCardProps {
  surah: number;
  verse: Verse;
  translation: Language | null;
  /**
   * Transliteration to show under the Arabic, or null when Latin is off.
   */
  latin: string | null;
  /**
   * Recitation state, only set on the verse being recited so the other
   * cards' props stay stable and memo skips them on every word tick.
   */
  recitation: { word: number | null; playing: boolean; loading: boolean; single: boolean } | null;
  selectedWords: { from: number; to: number } | null;
  bookmarked: boolean;
  note: string | null;
  signedIn: boolean;
  onToggleBookmark: (verse: number) => void;
}

function ActionButton({ active, className, ...props }: React.ComponentProps<typeof Button> & { active?: boolean }) {
  return (
    <Button
      variant="ghost"
      size="xs"
      className={cn(
        'text-muted-foreground',
        active && 'bg-highlight text-highlight-foreground hover:bg-highlight',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Phones: the verse's secondary actions in a bottom sheet behind ⋯.
 */
function VerseMoreSheet({
  open,
  onOpenChange,
  verseKey,
  signedIn,
  copied,
  onPlayFromHere,
  onCopyLink,
  onNote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verseKey: string;
  signedIn: boolean;
  copied: boolean;
  onPlayFromHere: () => void;
  onCopyLink: () => Promise<void>;
  onNote: () => void;
}) {
  const t = useT();
  const row =
    'flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors hover:bg-muted [&_svg]:size-4.5 [&_svg]:text-gold-ink';
  const then = (action: () => unknown) => () => {
    void action();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="rounded-t-[1.75rem] border-gold/35 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <DrawerTitle className="px-5 pt-1 pb-2 font-serif text-base font-normal">
          {t.moreActions} <span className="text-gold-ink tabular-nums">{verseKey}</span>
        </DrawerTitle>
        <div className="flex flex-col gap-0.5 px-2">
          <button type="button" className={row} onClick={then(onPlayFromHere)}>
            <ListVideo />
            {t.playFromHere}
          </button>
          <button type="button" className={row} onClick={then(onCopyLink)}>
            {copied ? <Check /> : <Link2 />}
            {copied ? t.copied : t.copyLink}
          </button>
          {signedIn ? (
            <button type="button" className={row} onClick={then(onNote)}>
              <NotebookPen />
              {t.note}
            </button>
          ) : (
            <Link to="/login" className={row} onClick={() => onOpenChange(false)}>
              <NotebookPen />
              {t.signInToNote}
            </Link>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Dressing for the verse being recited: the star lattice behind it, and a
 * corner badge whose medallion turns and bars move while the verse sounds.
 */
function RecitingOrnament({ playing }: { playing: boolean }) {
  const t = useT();

  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 animate-in overflow-hidden duration-500 fade-in">
        <Lattice className="opacity-80" />
      </span>
      <span className="absolute top-2.5 left-4 flex animate-in items-center gap-2 text-xs text-gold-ink duration-500 fade-in sm:left-6">
        <Medallion className="size-5" spinning={playing} />
        <span>{playing ? t.nowReciting : t.pausedLabel}</span>
        <span
          aria-hidden="true"
          data-paused={playing ? undefined : ''}
          className="recite-bars flex h-3 items-end gap-0.5">
          <span className="h-full w-0.5 rounded-full bg-gold" />
          <span className="h-full w-0.5 rounded-full bg-gold" />
          <span className="h-full w-0.5 rounded-full bg-gold" />
        </span>
      </span>
    </>
  );
}

export const VerseCard = memo(function VerseCard({
  surah,
  verse,
  translation,
  latin,
  recitation,
  selectedWords,
  bookmarked,
  note,
  signedIn,
  onToggleBookmark,
}: VerseCardProps) {
  const t = useT();
  const sajdah = isSajdah(verse.key);
  const [tafsirOpen, setTafsirOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [moreOpen, setMoreOpenState] = useState(false);
  const [moreMounted, setMoreMounted] = useState(false);
  // The drawer is created on first use, not up front for every verse.
  const setMoreOpen = (open: boolean) => {
    if (open) setMoreMounted(true);
    setMoreOpenState(open);
  };
  const isPlaying = !!recitation?.playing && recitation.single;
  const isLoading = !!recitation?.loading && recitation.single;

  async function copyLink() {
    await navigator.clipboard.writeText(`${location.origin}/surah/${surah}#v${verse.n}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'p') toggleVerse(surah, verse.n);
    else if (event.key === 't') setTafsirOpen((open) => !open);
    else if (event.key === 'c') void copyLink();
    else if (event.key === 'b' && signedIn) onToggleBookmark(verse.n);
    else if (event.key === 'n' && signedIn) setEditing((open) => !open);
    else return;
    event.preventDefault();
  }

  return (
    // The marker sits outside the article: `.verse-card` uses content-visibility,
    // whose paint containment would clip anything drawn in the margin.
    <div className="relative">
      <MarginMarker verse={verse.n} sajdah={sajdah} />
      <article
        id={`v${verse.n}`}
        data-verse={verse.n}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: verses take focus so j/k and the per-verse keys (P, T, C, B, N) work
        tabIndex={0}
        aria-label={verse.key}
        onKeyDown={onKeyDown}
        data-reciting={recitation ? '' : undefined}
        className="verse-card group relative -mx-4 scroll-mt-6 px-4 py-8 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:-mx-6 sm:px-6">
        {recitation && <RecitingOrnament playing={recitation.playing} />}
        <p
          dir="rtl"
          lang="ar"
          className={cn('font-arabic leading-[2.2] select-none', recitation && 'reciting')}
          style={{ fontSize: 'var(--arabic-size)' }}>
          {verse.words.map((word, i) => {
            const position = i + 1;
            const selected = selectedWords && position >= selectedWords.from && position <= selectedWords.to;
            const isLast = position === verse.words.length;
            const span = (
              <span
                key={position}
                data-word={position}
                data-recite={recitation ? reciteState(position, recitation.word) : undefined}
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
          })}
        </p>

        {latin && (
          <p
            lang="ar-Latn"
            className="mt-4 max-w-[65ch] font-serif text-[1.0625rem] leading-[1.7] text-gold-ink italic">
            {latin}
          </p>
        )}
        {translation && (
          <p className="mt-4 max-w-[65ch] font-serif text-[1.0625rem] leading-[1.75] text-foreground/80">
            {verse[translation]}
          </p>
        )}

        {sajdah && <SajdahNote />}

        {note && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-4 block w-full rounded-r-lg border-l-2 border-gold bg-gold/8 px-4 py-2.5 text-left font-serif text-sm whitespace-pre-line text-foreground/75 italic">
            {note}
          </button>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-0.5">
          <span className="mr-2 text-xs text-gold-ink tabular-nums">{verse.key}</span>
          <ActionButton active={isPlaying || isLoading} onClick={() => toggleVerse(surah, verse.n)}>
            {isLoading ? <Loader2 className="animate-spin" /> : isPlaying ? <Pause /> : <Play />}
            {isPlaying ? t.pause : t.play}
          </ActionButton>
          <ActionButton active={tafsirOpen} aria-expanded={tafsirOpen} onClick={() => setTafsirOpen((open) => !open)}>
            <BookOpenText />
            {t.tafsir}
          </ActionButton>

          {/* Secondary actions: inline from md up, behind ⋯ on phones. */}
          <ActionButton
            className="hidden md:inline-flex"
            title={t.playFromHere}
            aria-label={t.playFromHere}
            onClick={() => play(surah, verse.n, { continuous: true })}>
            <ListVideo />
          </ActionButton>
          <ActionButton className="hidden md:inline-flex" onClick={copyLink}>
            {copied ? <Check /> : <Link2 />}
            {copied ? t.copied : t.copyLink}
          </ActionButton>
          {signedIn ? (
            <ActionButton
              className="hidden md:inline-flex"
              active={editing}
              onClick={() => setEditing((open) => !open)}>
              <NotebookPen />
              {t.note}
            </ActionButton>
          ) : (
            <Link
              to="/login"
              className="hidden h-6 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted md:inline-flex [&_svg]:size-3">
              <NotebookPen />
              {t.note}
            </Link>
          )}
          <ActionButton
            className="md:hidden"
            title={t.moreActions}
            aria-label={t.moreActions}
            aria-haspopup="dialog"
            onClick={() => setMoreOpen(true)}>
            <Ellipsis />
          </ActionButton>

          <span className="ml-auto">
            {signedIn ? (
              <ActionButton
                active={bookmarked}
                aria-pressed={bookmarked}
                aria-label={bookmarked ? t.bookmarked : t.bookmark}
                title={bookmarked ? t.bookmarked : t.bookmark}
                onClick={() => onToggleBookmark(verse.n)}>
                <Bookmark className={cn(bookmarked && 'fill-current')} />
                <span className="hidden md:inline">{bookmarked ? t.bookmarked : t.bookmark}</span>
              </ActionButton>
            ) : (
              <Link
                to="/login"
                aria-label={t.bookmark}
                title={t.bookmark}
                className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted [&_svg]:size-3">
                <Bookmark />
                <span className="hidden md:inline">{t.bookmark}</span>
              </Link>
            )}
          </span>
        </div>

        {moreMounted && (
          <VerseMoreSheet
            open={moreOpen}
            onOpenChange={setMoreOpen}
            verseKey={verse.key}
            signedIn={signedIn}
            copied={copied}
            onPlayFromHere={() => play(surah, verse.n, { continuous: true })}
            onCopyLink={copyLink}
            onNote={() => setEditing(true)}
          />
        )}

        {editing && (
          <NoteEditor surah={surah} verse={verse.n} initialBody={note ?? ''} onDone={() => setEditing(false)} />
        )}
        {tafsirOpen && <TafsirPanel surah={surah} verse={verse.n} />}
      </article>
    </div>
  );
});
