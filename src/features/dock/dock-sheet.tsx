import { useIsPhone } from '#/hooks/use-media-query.ts';
import { dockStore } from '#/lib/prefs.ts';
import { FloatingSheet } from './dock-sheet-floating.tsx';
import { PhoneSheet } from './dock-sheet-phone.tsx';

/**
 * The panels behind the dock's buttons: a bottom drawer on phones, a
 * floating sheet elsewhere. Escape, the backdrop, or the dock button close it.
 */
export function DockSheet() {
  const view = dockStore.use();
  const isPhone = useIsPhone();

  if (isPhone) return <PhoneSheet view={view} />;
  return view ? <FloatingSheet view={view} /> : null;
}
