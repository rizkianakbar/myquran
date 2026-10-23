import { ArrowLeft } from 'lucide-react';
import { ShortcutList } from '#/components/shortcut-list.tsx';
import { reciters } from '#/features/audio/audio.api.ts';
import { play, stop } from '#/features/audio/audio.lib.ts';
import { useT } from '#/lib/i18n.ts';
import {
  type ArabicFont,
  arabicFonts,
  arabicSizeRange,
  formatRate,
  type Language,
  type LatinStyle,
  playbackRates,
  setPref,
  type Theme,
  type TranslationPref,
  themes,
  usePrefs,
} from '#/lib/prefs.ts';
import { useGoBack } from './settings.hooks.ts';
import { SettingsRow, SettingsSegmented, SettingsSelect } from './settings-controls.tsx';

const PREVIEW_TEXT = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';

export function SettingsPage() {
  const t = useT();
  const prefs = usePrefs();
  const goBack = useGoBack();

  return (
    <main id="main-content" className="min-w-0 grow">
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
          <SettingsRow label={t.language} hint={t.languageHint}>
            <SettingsSegmented<Language>
              label={t.language}
              value={prefs.language}
              onChange={(v) => setPref('language', v)}
              options={[
                { value: 'en', label: 'English' },
                { value: 'id', label: 'Bahasa Indonesia' },
              ]}
            />
          </SettingsRow>

          <SettingsRow label={t.translation}>
            <SettingsSegmented<TranslationPref>
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
          </SettingsRow>

          <SettingsRow label={t.latin} hint={t.latinHint}>
            <SettingsSegmented<'on' | 'off'>
              label={t.latin}
              value={prefs.latin ? 'on' : 'off'}
              onChange={(v) => setPref('latin', v === 'on')}
              options={[
                { value: 'on', label: t.on },
                { value: 'off', label: t.translationOff },
              ]}
            />
          </SettingsRow>

          <SettingsRow label={t.latinStyle} hint={t.latinStyleHint}>
            <SettingsSegmented<LatinStyle>
              label={t.latinStyle}
              value={prefs.latinStyle}
              onChange={(v) => setPref('latinStyle', v)}
              options={[
                { value: 'kemenag', label: t.latinKemenag },
                { value: 'simple', label: t.latinSimple },
              ]}
            />
          </SettingsRow>

          <SettingsRow label={t.theme}>
            <SettingsSegmented<Theme>
              label={t.theme}
              value={prefs.theme}
              onChange={(v) => setPref('theme', v)}
              options={themes.map((theme) => ({ value: theme, label: t.themeNames[theme] }))}
            />
          </SettingsRow>

          <SettingsRow label={t.arabicFont}>
            <SettingsSelect
              prefKey="arabicFont"
              label={t.arabicFont}
              parse={(v) => v as ArabicFont}
              options={Object.entries(arabicFonts).map(([value, f]) => ({ value, label: f.label }))}
            />
          </SettingsRow>

          <SettingsRow label={t.arabicSize}>
            <input
              type="range"
              min={arabicSizeRange.min}
              max={arabicSizeRange.max}
              step={arabicSizeRange.step}
              value={prefs.arabicSize}
              aria-label={t.arabicSize}
              onChange={(e) => setPref('arabicSize', Number(e.target.value))}
              className="w-48 accent-foreground"
            />
          </SettingsRow>

          <div className="rounded-xl border bg-card px-4 py-5">
            <p
              dir="rtl"
              lang="ar"
              className="text-center font-arabic leading-[2.1]"
              style={{ fontSize: 'var(--arabic-size)' }}>
              {PREVIEW_TEXT}
            </p>
          </div>

          <SettingsRow label={t.wordByWord} hint={t.wordByWordHint}>
            <SettingsSegmented<'on' | 'off'>
              label={t.wordByWord}
              value={prefs.wordByWord ? 'on' : 'off'}
              onChange={(v) => setPref('wordByWord', v === 'on')}
              options={[
                { value: 'on', label: t.on },
                { value: 'off', label: t.translationOff },
              ]}
            />
          </SettingsRow>

          <SettingsRow label={t.speed} hint={t.speedHint}>
            <SettingsSegmented<string>
              label={t.speed}
              value={String(prefs.playbackRate)}
              onChange={(v) => setPref('playbackRate', Number(v))}
              options={playbackRates.map((rate) => ({ value: String(rate), label: formatRate(rate) }))}
            />
          </SettingsRow>

          <SettingsRow label={t.reciter}>
            <div className="flex items-center gap-2">
              <SettingsSelect
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
          </SettingsRow>

          <SettingsRow label={t.planOnHome} hint={t.planOnHomeHint}>
            <SettingsSegmented<'on' | 'off'>
              label={t.planOnHome}
              value={prefs.planOnHome ? 'on' : 'off'}
              onChange={(v) => setPref('planOnHome', v === 'on')}
              options={[
                { value: 'on', label: t.on },
                { value: 'off', label: t.translationOff },
              ]}
            />
          </SettingsRow>

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
