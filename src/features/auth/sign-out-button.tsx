import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { Button } from '#/components/ui/button.tsx';
import { authClient } from '#/lib/auth-client.ts';
import { useT } from '#/lib/i18n.ts';
import { bookmarksQueries } from '#/server/bookmarks.functions.ts';
import { notesQueries } from '#/server/notes.functions.ts';

export function SignOutButton() {
  const t = useT();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  if (!session) return null;
  const signOut = async () => {
    await authClient.signOut();
    // Drop the previous user's private data from the cache.
    queryClient.removeQueries({ queryKey: notesQueries.all });
    queryClient.removeQueries({ queryKey: bookmarksQueries.all });
  };
  return (
    <Button variant="ghost" size="icon-sm" title={t.signOut} aria-label={t.signOut} onClick={signOut}>
      <LogOut />
    </Button>
  );
}
