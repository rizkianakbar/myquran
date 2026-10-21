import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { authClient } from '../lib/auth';

/**
 * Guards every `_authenticated.*` route. Navigation and sign-out live in the
 * app shell, so this layout only redirects and renders its child.
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();

    if (!session) throw redirect({ to: '/login' });

    return { session };
  },
  component: () => (
    <main id="main-content" className="min-w-0 grow overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
      <Outlet />
    </main>
  ),
});
