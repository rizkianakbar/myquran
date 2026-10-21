import { Volume2 } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '#/components/ui/button.tsx';
import { playWord } from '#/features/audio/audio.lib.ts';
import { useT } from '#/lib/i18n.ts';
import type { Language } from '#/lib/prefs.ts';
import type { Verse } from '#/lib/quran/types.ts';

export interface WordSelection {
  verse: Verse;
  word: number;
  /**
   * Anchor rect of the word in viewport coordinates.
   */
  rect: { left: number; right: number; top: number; bottom: number };
  pinned: boolean;
}

const GAP = 8;
const MARGIN = 12;

export function WordPopover({
  surah,
  selection,
  language,
  onPointerLeave,
}: {
  surah: number;
  selection: WordSelection;
  language: Language;
  onPointerLeave: (event: React.PointerEvent) => void;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const word = selection.verse.words[selection.word - 1];
  // Indonesian word glosses are sparse upstream; fall back to English.
  const gloss = (language === 'id' && word?.id) || word?.en;

  useLayoutEffect(() => {
    const card = ref.current;
    if (!card) return;
    const { width, height } = card.getBoundingClientRect();
    const { rect } = selection;
    const center = (rect.left + rect.right) / 2;
    const left = Math.min(Math.max(center - width / 2, MARGIN), window.innerWidth - width - MARGIN);
    const above = rect.top - height - GAP;
    setPosition({ left, top: above >= MARGIN ? above : rect.bottom + GAP });
  }, [selection]);

  if (!word) return null;

  return (
    <div
      ref={ref}
      role="tooltip"
      onPointerLeave={onPointerLeave}
      style={{ left: position?.left ?? -9999, top: position?.top ?? -9999 }}
      className="fixed z-50 max-w-64 animate-in rounded-xl border bg-popover px-3 py-2 text-popover-foreground shadow-lg fade-in zoom-in-95">
      <div className="flex items-center gap-3">
        <span dir="rtl" lang="ar" className="font-arabic text-2xl leading-normal">
          {word.a}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          className="ml-auto text-muted-foreground"
          title={t.playWord}
          aria-label={t.playWord}
          onClick={() => playWord(surah, selection.verse.n, selection.word)}>
          <Volume2 />
        </Button>
      </div>
      {word.t && (
        <p lang="ar-Latn" className="font-serif text-sm text-gold-ink italic">
          {word.t}
        </p>
      )}
      <p className="text-sm">{gloss}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
        {selection.verse.key}:{selection.word}
      </p>
    </div>
  );
}
