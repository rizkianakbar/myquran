import { useEffect, useRef, useState } from 'react';
import { rosetteFor } from '#/components/ornament/geometry.ts';
import { VerseMarker } from '#/components/ornament/headpiece.tsx';
import { Lattice } from '#/components/ornament/lattice.tsx';
import { Rosette } from '#/components/ornament/rosette.tsx';
import { chromeHiddenStore } from '#/lib/chrome.ts';
import { pageScroller } from '#/lib/page-scroll.ts';
import { useProgress } from '#/lib/progress.ts';
import { toArabicNumber } from '#/lib/quran/data.ts';
import type { Chapter } from '#/lib/quran/types.ts';
import { cn } from '#/lib/utils.ts';
import { CompactSurahControls, type SurahControlsProps } from './reader-controls.tsx';

/**
 * Fill `barRef`'s width with how far the reader has scrolled, 0–1. Unlike
 * the topmost verse, this reaches 1 exactly at the end of the surah. The
 * width is written straight to the element: a React update on every scroll
 * event costs frames on a phone. Returns whether the end has been reached.
 */
function useScrollProgress(rootRef: React.RefObject<HTMLElement | null>, barRef: React.RefObject<HTMLElement | null>) {
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const page = pageScroller();
    const measure = () => {
      const range = page.scrollHeight - window.innerHeight;
      const fraction = range > 0 ? Math.min(1, page.scrollTop / range) : 1;
      if (barRef.current) barRef.current.style.width = `${fraction * 100}%`;
      setAtEnd(fraction > 0.995);
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(root);
    return () => {
      window.removeEventListener('scroll', measure);
      resize.disconnect();
    };
  }, [rootRef, barRef]);

  return atEnd;
}

/**
 * A manuscript running head: once the headpiece scrolls away, a slim
 * illuminated band keeps the surah's name, the verse being read, and the
 * surah's controls in reach. Its gold rule fills as the surah is read.
 */
export function RunningHead({
  chapter,
  headerRef,
  rootRef,
  controls,
}: {
  chapter: Chapter;
  headerRef: React.RefObject<HTMLElement | null>;
  rootRef: React.RefObject<HTMLElement | null>;
  controls: SurahControlsProps;
}) {
  const [pastHeader, setPastHeader] = useState(false);
  const chromeHidden = chromeHiddenStore.use();
  const visible = pastHeader && !chromeHidden;
  const barRef = useRef<HTMLSpanElement>(null);
  const atEnd = useScrollProgress(rootRef, barRef);
  const { lastRead } = useProgress();
  const surah = chapter.number;
  // The last verses can never reach the top of the screen, so at the bottom
  // the topmost verse undercounts; name the final verse instead.
  const verse = atEnd ? chapter.versesCount : lastRead?.surah === surah ? lastRead.verse : 1;

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const observer = new IntersectionObserver(([entry]) => setPastHeader(!entry.isIntersecting), {
      rootMargin: '-56px 0px 0px 0px',
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, [headerRef]);

  return (
    <div className="sticky top-0 z-20 h-0">
      <div
        inert={!visible}
        className={cn(
          'dark relative overflow-hidden bg-(--ornament-field) text-foreground shadow-[0_10px_30px_-14px_oklch(0.15_0.05_262/0.7)] transition-[translate,opacity,visibility] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          // `invisible` once faded, so iOS Safari doesn't sample it into the status bar area.
          visible ? 'translate-y-0 opacity-100' : 'pointer-events-none invisible -translate-y-full opacity-0',
        )}>
        <Lattice />

        <div className="relative mx-auto grid h-14 max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-2.5">
            <svg viewBox="0 0 40 40" aria-hidden="true" className="size-8 shrink-0">
              <Rosette cx={20} cy={20} r={19} spec={rosetteFor(surah)} />
            </svg>
            <span dir="rtl" lang="ar" className="font-kufi text-xl leading-none text-gold">
              {chapter.nameArabic}
            </span>
            <span className="hidden truncate font-serif text-sm text-muted-foreground sm:inline">
              {chapter.nameSimple}
            </span>
          </div>

          <div className="flex h-8 items-center gap-1.5 rounded-full bg-(--ornament-ground) pr-3 pl-1 ring-1 ring-gold/40">
            <VerseMarker n={toArabicNumber(verse)} className="mx-0 text-[1.5rem]" />
            <span className="text-sm text-gold tabular-nums">
              {surah}:{verse}
            </span>
            <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">/ {chapter.versesCount}</span>
          </div>

          <CompactSurahControls {...controls} />
        </div>

        <span aria-hidden="true" className="absolute inset-x-0 bottom-0.75 h-px bg-gold/30" />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gold/50" />
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-0.75 rounded-r-full bg-gold transition-[width] duration-150 ease-out"
          ref={barRef}
        />
      </div>
    </div>
  );
}
