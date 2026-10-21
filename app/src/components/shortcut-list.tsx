import { useT } from '#app/src/lib/i18n.ts';
import { shortcutGroups, shortcuts } from '#app/src/lib/shortcuts.ts';
import { cn } from '#assets/lib/utils.ts';

function KeyCap({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-b-2 bg-card px-1.5 font-sans text-xs text-foreground">
      {children}
    </kbd>
  );
}

/**
 * Every shortcut, grouped, rendered straight from the shortcut registry.
 */
export function ShortcutList({ columns = false }: { columns?: boolean }) {
  const t = useT();

  return (
    <div className={cn('grid gap-x-10 gap-y-6', columns && 'md:grid-cols-2')}>
      {shortcutGroups.map((group) => (
        <section key={group}>
          <h3 className="mb-2 font-serif text-sm text-gold-ink">{t.shortcutGroupNames[group]}</h3>
          <dl className="divide-y">
            {shortcuts
              .filter((s) => s.group === group)
              .map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-4 py-1.5 text-sm">
                  <dt className="text-muted-foreground">{t.shortcutLabels[s.id]}</dt>
                  <dd className="flex shrink-0 items-center gap-1">
                    {s.keys.map((key, i) => (
                      <span key={key} className="flex items-center gap-1">
                        {i > 0 && <span className="text-xs text-muted-foreground">/</span>}
                        <KeyCap>{key}</KeyCap>
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
