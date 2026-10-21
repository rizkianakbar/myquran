import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { ShortcutList } from '#/components/shortcut-list.tsx';
import { useT } from '#/lib/i18n.ts';
import { play, stop } from '#/lib/player.ts';
import {
  type ArabicFont,
  arabicFonts,
  formatRate,
  type Language,
  type LatinStyle,
  type Prefs,
  playbackRates,
  setPref,
  type Theme,
  type TranslationPref,
  themes,
  usePrefs,
} from '#/lib/prefs.ts';
import { reciters } from '#/lib/quran/audio.ts';
import { cn } from '#/lib/utils.ts';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

const PREVIEW_TEXT = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <fieldset className="inline-flex flex-wrap gap-1 rounded-lg border bg-muted/50 p-0.5">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground',
            option.value === value && 'bg-background text-foreground shadow-sm',
          )}>
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

function Select<K extends keyof Prefs>({
  prefKey,
  label,
  options,
  parse,
}: {
  prefKey: K;
  label: string;
  options: { value: string; label: string }[];
  parse: (raw: string) => Prefs[K];
}) {
  const prefs = usePrefs();
  return (
    <select
      aria-label={label}
      value={String(prefs[prefKey])}
      onChange={(e) => setPref(prefKey, parse(e.target.value))}
      className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Back to wherever Settings was opened from; Home when it was opened
 * directly (a fresh tab or a pasted link has no in-app history).
 */
function useGoBack() {
  const router = useRouter();
  const navigate = useNavigate();
  return () => (router.history.canGoBack() ? router.history.back() : navigate({ to: '/' }));
}

function SettingsPage() {
  const t = useT();
  const prefs = usePrefs();
  const goBack = useGoBack();

  return (
    <main id="main-content" className="min-w-0 grow overflow-y-auto">
      <title>{`${t.settings} · ${t.appName}`}</title>
      <div className="mx-auto max-w-2xl px-4 pt-10 pb-40 sm:px-6">
        <button
          type="button"
          onClick={goBack}
          className="-ml-2 flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm text-muted-foreground transition-colors hover:bg-gold/10 hover:text-gold-ink focus-visible:outline-2 focus-visible:outline-gold [&_svg]:size-4">
          <ArrowLeft />
          {t.back}
        </button>
        <h1 className="mt-4 font-serif text-2xl">{t.settings}</h1>

        <div className="mt-6 divide-y">
          <Row label={t.language} hint={t.languageHint}>
            <Segmented<Language>
              label={t.language}
              value={prefs.language}
              onChange={(v) => setPref('language', v)}
              options={[
                { value: 'en', label: 'English' },
                { value: 'id', label: 'Bahasa Indonesia' },
              ]}
            />
          </Row>

          <Row label={t.translation}>
            <Segmented<TranslationPref>
              label={t.translation}
              value={prefs.translation}
              onChange={(v) => setPref('translation', v)}
              options={[
                { value: 'auto', label: t.translationAuto },
                { value: 'en', label: 'EN' },
                { value: 'id', label: 'ID' },
                { value: 'off', label: t.translationOff },
              ]}
            />
          </Row>

          <Row label={t.latin} hint={t.latinHint}>
            <Segmented<'on' | 'off'>
              label={t.latin}
              value={prefs.latin ? 'on' : 'off'}
              onChange={(v) => setPref('latin', v === 'on')}
              options={[
                { value: 'on', label: t.on },
                { value: 'off', label: t.translationOff },
              ]}
            />
          </Row>

          <Row label={t.latinStyle} hint={t.latinStyleHint}>
            <Segmented<LatinStyle>
              label={t.latinStyle}
              value={prefs.latinStyle}
              onChange={(v) => setPref('latinStyle', v)}
              options={[
                { value: 'kemenag', label: t.latinKemenag },
                { value: 'simple', label: t.latinSimple },
              ]}
            />
          </Row>

          <Row label={t.theme}>
            <Segmented<Theme>
              label={t.theme}
              value={prefs.theme}
              onChange={(v) => setPref('theme', v)}
              options={themes.map((theme) => ({ value: theme, label: t.themeNames[theme] }))}
            />
          </Row>

          <Row label={t.arabicFont}>
            <Select
              prefKey="arabicFont"
              label={t.arabicFont}
              parse={(v) => v as ArabicFont}
              options={Object.entries(arabicFonts).map(([value, f]) => ({ value, label: f.label }))}
            />
          </Row>

          <Row label={t.arabicSize}>
            <input
              type="range"
              min={1.25}
              max={3.5}
              step={0.125}
              value={prefs.arabicSize}
              aria-label={t.arabicSize}
              onChange={(e) => setPref('arabicSize', Number(e.target.value))}
              className="w-48 accent-foreground"
            />
          </Row>

          <div className="rounded-xl border bg-card px-4 py-5">
            <p
              dir="rtl"
              lang="ar"
              className="text-center font-arabic leading-[2.1]"
              style={{ fontSize: 'var(--arabic-size)' }}>
              {PREVIEW_TEXT}
            </p>
          </div>

          <Row label={t.wordByWord} hint={t.wordByWordHint}>
            <Segmented<'on' | 'off'>
              label={t.wordByWord}
              value={prefs.wordByWord ? 'on' : 'off'}
              onChange={(v) => setPref('wordByWord', v === 'on')}
              options={[
                { value: 'on', label: 'On' },
                { value: 'off', label: t.translationOff },
              ]}
            />
          </Row>

          <Row label={t.speed} hint={t.speedHint}>
            <Segmented<string>
              label={t.speed}
              value={String(prefs.playbackRate)}
              onChange={(v) => setPref('playbackRate', Number(v))}
              options={playbackRates.map((rate) => ({ value: String(rate), label: formatRate(rate) }))}
            />
          </Row>

          <Row label={t.reciter}>
            <div className="flex items-center gap-2">
              <Select
                prefKey="reciter"
                label={t.reciter}
                parse={Number}
                options={reciters.map((r) => ({ value: String(r.id), label: r.name }))}
              />
              <button
                type="button"
                className="rounded-lg border px-2.5 py-1 text-sm hover:bg-muted"
                onClick={() => {
                  stop();
                  void play(1, 1);
                }}>
                {t.play}
              </button>
            </div>
          </Row>

          <section className="py-6">
            <h2 className="font-serif text-lg">{t.shortcuts}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{t.shortcutHelp}</p>
            <ShortcutList />
          </section>
        </div>
      </div>
    </main>
  );
}
