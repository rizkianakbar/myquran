import { useT } from '#/lib/i18n.ts';

export function ReaderLoadError() {
  const t = useT();
  return <main className="grow p-10 text-center text-sm text-muted-foreground">{t.dataMissing}</main>;
}

export function ReaderNotFound() {
  const t = useT();
  return <main className="grow p-10 text-center text-muted-foreground">{t.surahNotFound}</main>;
}
