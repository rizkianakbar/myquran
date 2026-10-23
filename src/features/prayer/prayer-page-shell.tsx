import { ArrowLeft, MapPin } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Button } from '#/components/ui/button.tsx';
import { useGoBack } from '#/features/settings/settings.hooks.ts';
import { useT } from '#/lib/i18n.ts';
import { prayerStore } from './prayer.store.ts';
import type { Place } from './prayer.types.ts';
import { PrayerLocationPicker } from './prayer-location.tsx';

/**
 * The frame both prayer pages share: back, title, and the place they're for,
 * with the picker in place of the content until a place is chosen.
 */
export function PrayerPageShell({ title, children }: { title: string; children: (place: Place) => ReactNode }) {
  const t = useT();
  const goBack = useGoBack();
  const { place } = prayerStore.use();
  const [picking, setPicking] = useState(false);

  return (
    <main id="main-content" className="min-w-0 grow">
      <title>{`${title} · ${t.appName}`}</title>
      <div className="mx-auto max-w-2xl px-4 pt-10 pb-40 sm:px-6">
        <button
          type="button"
          onClick={goBack}
          className="pressable -ml-2 flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm text-muted-foreground hover:bg-gold/10 hover:text-gold-ink focus-visible:outline-2 focus-visible:outline-gold [&_svg]:size-4">
          <ArrowLeft />
          {t.back}
        </button>
        <h1 className="mt-4 font-serif text-2xl">{title}</h1>

        {place && !picking ? (
          <>
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-gold-ink [&_svg]:size-3.5">
              <MapPin />
              <span>
                {place.name ?? t.currentLocation}
                {place.detail && <span className="opacity-75">, {place.detail}</span>}
              </span>
              <span aria-hidden="true">·</span>
              <span className="underline-offset-4 hover:underline">{t.changeLocation}</span>
            </button>
            <div className="mt-8">{children(place)}</div>
          </>
        ) : (
          <div className="mt-6 rounded-xl border bg-card p-5">
            <p className="mb-4 text-sm text-muted-foreground">{t.locationPrompt}</p>
            <PrayerLocationPicker onDone={() => setPicking(false)} />
            {place && (
              <Button variant="ghost" size="sm" className="mt-3 -ml-2.5" onClick={() => setPicking(false)}>
                {t.cancel}
              </Button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
