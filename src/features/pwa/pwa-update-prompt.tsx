import { useState } from 'react';
import { Button } from '#/components/ui/button.tsx';
import { useT } from '#/lib/i18n.ts';
import { applyUpdate, pwaStore } from './pwa.lib.ts';

/**
 * Offers a waiting new version. The reader chooses when to reload, so a
 * surah being read is never swapped out from under them.
 */
export function PwaUpdatePrompt() {
  const t = useT();
  const { updateReady } = pwaStore.use();
  const [dismissed, setDismissed] = useState(false);
  if (!updateReady || dismissed) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-60 mx-auto flex max-w-md animate-in items-center gap-3 rounded-2xl bg-popover py-2 pr-2 pl-4 text-sm text-popover-foreground shadow-lg ring-1 ring-gold/35 duration-300 fade-in slide-in-from-top-2">
      <span className="grow">{t.updateReady}</span>
      <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
        {t.later}
      </Button>
      <Button size="sm" onClick={applyUpdate}>
        {t.updateRefresh}
      </Button>
    </div>
  );
}
