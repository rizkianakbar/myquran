import { useState } from 'react';

const COPIED_MS = 1500;

/**
 * Copy a link to the verse; `copied` reads true briefly afterwards.
 */
export function useCopyVerseLink(surah: number, verse: number) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(`${location.origin}/surah/${surah}#v${verse}`);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  }

  return { copied, copyLink };
}

/**
 * Open state for a drawer that is only created on first use, not up front
 * for every verse.
 */
export function useLazyDrawer() {
  const [open, setOpenState] = useState(false);
  const [mounted, setMounted] = useState(false);

  function setOpen(next: boolean) {
    if (next) setMounted(true);
    setOpenState(next);
  }

  return { open, mounted, setOpen };
}
