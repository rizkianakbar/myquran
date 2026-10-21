import { type ReactNode, useState } from 'react';
import { SignOutButton } from '#/features/auth/sign-out-button.tsx';
import { NotesPanel } from '#/features/notes/notes-panel.tsx';
import { useT } from '#/lib/i18n.ts';
import { cn } from '#/lib/utils.ts';
import { JournalProgress } from './journal-progress.tsx';

type JournalTab = 'progress' | 'notes';

/**
 * One journal column with its own heading and its own scroll, so a long
 * list of notes never drags the progress stats out of view.
 */
function JournalColumn({
  title,
  action,
  active,
  children,
}: {
  title: string;
  action?: ReactNode;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className={cn('min-h-0 flex-col', active ? 'flex' : 'hidden', 'md:flex')}>
      <header className="hidden h-14 shrink-0 items-center justify-between gap-2 px-6 md:flex">
        <h3 className="font-serif text-base">{title}</h3>
        {action}
      </header>
      <div className="min-h-0 grow space-y-6 overflow-y-auto overscroll-contain px-5 pt-5 pb-6 md:px-6 md:pt-1">
        {children}
      </div>
    </section>
  );
}

/**
 * The reader's journey: progress beside notes. Two independently scrolling
 * columns on wide screens; tabs on phones, where two scroll areas would fight.
 */
export function JournalPanel() {
  const t = useT();
  const [tab, setTab] = useState<JournalTab>('progress');
  const tabs: { id: JournalTab; label: string }[] = [
    { id: 'progress', label: t.yourProgress },
    { id: 'notes', label: t.notes },
  ];

  return (
    <div className="flex min-h-0 grow flex-col">
      <div className="flex items-center gap-1 border-b px-4 py-2 md:hidden">
        <div role="tablist" aria-label={t.journal} className="flex gap-1">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                'rounded-full px-3 py-1 text-sm text-muted-foreground transition-colors',
                tab === id && 'bg-gold/15 text-gold-ink',
              )}>
              {label}
            </button>
          ))}
        </div>
        <span className="grow" />
        {tab === 'notes' && <SignOutButton />}
      </div>

      <div className="grid min-h-0 grow md:grid-cols-2 md:divide-x">
        <JournalColumn title={t.yourProgress} active={tab === 'progress'}>
          <JournalProgress />
        </JournalColumn>
        <JournalColumn title={t.notes} action={<SignOutButton />} active={tab === 'notes'}>
          <NotesPanel />
        </JournalColumn>
      </div>
    </div>
  );
}
