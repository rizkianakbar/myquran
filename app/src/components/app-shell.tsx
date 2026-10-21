import { useNavigate, useRouterState } from '@tanstack/react-router';
import { type ReactNode, useEffect } from 'react';
import { useT } from '#app/src/lib/i18n.ts';
import { skipVerse, stop, togglePause } from '#app/src/lib/player.ts';
import {
  arabicFonts,
  closeDock,
  darkThemes,
  dockStore,
  prefsStore,
  setPref,
  stepPlaybackRate,
  toggleDock,
  usePrefs,
} from '#app/src/lib/prefs.ts';
import { useShortcut } from '#app/src/lib/shortcuts.ts';
import { Dock } from './dock.tsx';
import { DockSheet } from './dock-sheet.tsx';

function useApplyPrefs() {
  const prefs = usePrefs();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = prefs.theme;
    root.classList.toggle('dark', darkThemes.has(prefs.theme));
    root.lang = prefs.language;
    root.style.setProperty('--arabic-font', arabicFonts[prefs.arabicFont].family);
    root.style.setProperty('--arabic-size', `${prefs.arabicSize}rem`);
  }, [prefs.theme, prefs.language, prefs.arabicFont, prefs.arabicSize]);
}

const ARABIC_SIZE = { min: 1.25, max: 3.5, step: 0.125 };

function resizeArabic(direction: 1 | -1) {
  const next = prefsStore.get().arabicSize + direction * ARABIC_SIZE.step;
  setPref('arabicSize', Math.min(ARABIC_SIZE.max, Math.max(ARABIC_SIZE.min, next)));
}

/**
 * App-wide shortcuts. Pages register their own on top (see `useShortcut`).
 */
function useGlobalShortcuts() {
  const navigate = useNavigate();

  useShortcut('playPause', togglePause);
  useShortcut('stop', stop);
  useShortcut('prevRecited', () => skipVerse(-1));
  useShortcut('nextRecited', () => skipVerse(1));
  useShortcut('slower', () => stepPlaybackRate(-1));
  useShortcut('faster', () => stepPlaybackRate(1));
  useShortcut('biggerText', () => resizeArabic(1));
  useShortcut('smallerText', () => resizeArabic(-1));
  useShortcut('surahIndex', () => toggleDock('surahs'));
  useShortcut('search', () => dockStore.set('search'));
  useShortcut('journal', () => toggleDock('journal'));
  useShortcut('help', () => toggleDock('shortcuts'));
  useShortcut('home', () => navigate({ to: '/' }));
  useShortcut('settings', () => navigate({ to: '/settings' }));
  useShortcut('close', (event) => {
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) event.target.blur();
    closeDock();
  });
}

/**
 * Full-bleed pages with a floating dock instead of side rails: the reading
 * column always owns the whole width.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const href = useRouterState({ select: (s) => s.location.href });

  useApplyPrefs();
  useGlobalShortcuts();

  // biome-ignore lint/correctness/useExhaustiveDependencies: close the sheet whenever the location changes, hash jumps included
  useEffect(() => closeDock(), [href]);

  return (
    <div className="flex h-dvh overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-popover focus:px-4 focus:py-2 focus:text-sm focus:ring-1 focus:ring-gold">
        {t.skipToContent}
      </a>
      <div className="relative flex min-w-0 grow">{children}</div>
      <DockSheet />
      <Dock />
    </div>
  );
}
