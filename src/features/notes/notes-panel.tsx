import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Bookmark } from 'lucide-react';
import { buttonVariants } from '#/components/ui/button.tsx';
import { authClient } from '#/lib/auth-client.ts';
import { useT } from '#/lib/i18n.ts';
import { useChapters } from '#/lib/quran/data.ts';
import { bookmarksQueries } from '#/server/bookmarks.functions.ts';
import { notesQueries } from '#/server/notes.functions.ts';

function SignedInNotes() {
  const t = useT();
  const { data: chapters = [] } = useChapters();
  const notes = useQuery(notesQueries.list());
  const bookmarks = useQuery(bookmarksQueries.list());
  const surahName = (n: number) => chapters[n - 1]?.nameSimple ?? `Surah ${n}`;
  const isEmpty = notes.data?.length === 0 && bookmarks.data?.length === 0;

  return (
    <>
      {isEmpty && <p className="text-sm text-muted-foreground">{t.notesEmpty}</p>}

      {!!bookmarks.data?.length && (
        <section>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">{t.bookmarks}</h3>
          <ul className="space-y-0.5">
            {bookmarks.data.map((b) => (
              <li key={b.id}>
                <Link
                  to="/surah/$surah"
                  params={{ surah: b.surah }}
                  hash={`v${b.verse}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                  <Bookmark className="size-3.5 shrink-0 fill-current text-muted-foreground" />
                  <span className="truncate">{surahName(b.surah)}</span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {b.surah}:{b.verse}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!!notes.data?.length && (
        <section>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">{t.notes}</h3>
          <ul className="space-y-1">
            {notes.data.map((n) => (
              <li key={n.id}>
                <Link
                  to="/surah/$surah"
                  params={{ surah: n.surah }}
                  hash={`v${n.verse}`}
                  className="block rounded-lg px-2 py-2 text-sm hover:bg-muted">
                  <span className="text-xs font-medium text-muted-foreground">
                    {surahName(n.surah)}{' '}
                    <span className="ml-1 text-gold-ink tabular-nums">
                      {n.surah}:{n.verse}
                    </span>
                  </span>
                  <span className="mt-0.5 line-clamp-3 block whitespace-pre-line">{n.body}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/**
 * Notes column of the journal; the journal supplies the heading and scroll area.
 */
export function NotesPanel() {
  const t = useT();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;
  if (session) return <SignedInNotes />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.notesSignIn}</p>
      <Link to="/login" className={buttonVariants({ size: 'sm' })}>
        {t.signIn}
      </Link>
    </div>
  );
}
