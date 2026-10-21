import { createFileRoute, Link, Outlet, redirect, useNavigate } from '@tanstack/react-router';
import { authClient } from '../lib/auth';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();

    if (!session) throw redirect({ to: '/login' });

    return { session };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();

  const { session } = Route.useRouteContext();

  const handleLogout = async () => {
    await authClient.signOut();

    navigate({ to: '/login' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex shrink-0 items-center">
                <span className="text-xl font-bold">fullstack-starter</span>
              </div>

              <div className="ml-6 flex space-x-8">
                <Link
                  to="/posts"
                  className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">
                  Posts
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 transition-opacity duration-300">{session?.user?.email}</span>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 transition-opacity duration-300">
        <Outlet />
      </main>
    </div>
  );
}
