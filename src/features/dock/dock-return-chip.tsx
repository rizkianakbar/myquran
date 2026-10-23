import { ArrowDown, ArrowUp } from 'lucide-react';
import { usePlayer } from '#/features/audio/audio.hooks.ts';
import { followStore, returnToRecitation } from '#/features/audio/audio-follow.lib.ts';
import { useT } from '#/lib/i18n.ts';

/**
 * Shown once the reader scrolls away from the recited verse; points the way
 * back and returns them there.
 */
export function ReturnChip() {
  const t = useT();
  const { detached, direction, resumeAt } = followStore.use();
  const { verse } = usePlayer();
  if (!detached || verse === null) return null;

  return (
    <button
      type="button"
      onClick={() => returnToRecitation()}
      className="pointer-events-auto relative mb-2.5 flex h-9 animate-in items-center gap-2 overflow-hidden rounded-full bg-gold pr-2 pl-3.5 text-sm font-medium text-lapis shadow-[0_10px_24px_-8px_oklch(0.2_0.06_262/0.6)] pressable fade-in slide-in-from-bottom-2 hover:bg-gold/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold [&_svg]:size-4">
      {direction === 'up' ? <ArrowUp /> : <ArrowDown />}
      {t.backToVerse(verse)}
      <kbd className="ml-1 rounded border border-lapis/30 px-1.5 text-[11px] font-normal">R</kbd>
      {/* Drains until follow resumes on its own; refills while they scroll. */}
      {resumeAt !== null && (
        <span
          key={resumeAt}
          aria-hidden="true"
          className="resume-drain absolute bottom-0 left-0 h-0.5 w-full origin-left bg-lapis/45"
          style={{ animationDuration: `${Math.max(0, resumeAt - Date.now())}ms` }}
        />
      )}
    </button>
  );
}
