import { Download } from 'lucide-react';
import { Button } from '#/components/ui/button.tsx';
import { SettingsRow } from '#/features/settings/settings-controls.tsx';
import { useT } from '#/lib/i18n.ts';
import { isInstalled, isIos, promptInstall, pwaStore } from './pwa.lib.ts';

/**
 * The Settings row for installing Noorish: the browser's own prompt where
 * there is one, instructions on iOS (which has none), and a quiet note once
 * installed. Never a banner: installing is the reader's idea.
 */
export function PwaInstallRow() {
  const t = useT();
  const { canInstall } = pwaStore.use();
  if (typeof window === 'undefined') return null;

  if (isInstalled()) {
    return (
      <SettingsRow label={t.installApp} hint={t.installedNote}>
        {null}
      </SettingsRow>
    );
  }
  return (
    <SettingsRow label={t.installApp} hint={t.installHint}>
      {canInstall ? (
        <Button size="lg" onClick={() => void promptInstall()}>
          <Download data-icon="inline-start" />
          {t.installButton}
        </Button>
      ) : (
        <p className="max-w-56 text-sm text-muted-foreground">{isIos() ? t.installIos : t.installOther}</p>
      )}
    </SettingsRow>
  );
}
