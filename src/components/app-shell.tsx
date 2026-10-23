import { useRouterState } from '@tanstack/react-router';
import { type ReactNode, useEffect } from 'react';
import { Dock } from '#/features/dock/dock.tsx';
import { DockSheet } from '#/features/dock/dock-sheet.tsx';
import { useT } from '#/lib/i18n.ts';
import { closeDock } from '#/lib/prefs.ts';
import { useApplyPrefs, useGlobalShortcuts, usePrefetchAllSurahs } from './app-shell.hooks.ts';

/**
 * Full-bleed pages with a floating dock instead of side rails: the reading
 * column always owns the whole width.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const href = useRouterState({ select: (s) => s.location.href });

  useApplyPrefs();
  useGlobalShortcuts();
  usePrefetchAllSurahs();

  // biome-ignore lint/correctness/useExhaustiveDependencies: close the sheet whenever the location changes, hash jumps included
  useEffect(() => closeDock(), [href]);

  return (
    // The document scrolls, not an inner box (see `src/lib/page-scroll.ts`). With
    // viewport-fit=cover the side insets keep content clear of the notch in landscape.
    <div className="flex min-h-dvh pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-60 focus:rounded-full focus:bg-popover focus:px-4 focus:py-2 focus:text-sm focus:ring-1 focus:ring-gold">
        {t.skipToContent}
      </a>
      <div className="relative flex min-w-0 grow">{children}</div>
      <DockSheet />
      <Dock />
    </div>
  );
}
