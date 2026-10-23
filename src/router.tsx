import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { closeDock } from '#/lib/prefs.ts';
import { routeTree } from './routeTree.gen.ts';

/**
 * Called once per request on the server and once on the client, so each
 * request gets its own QueryClient.
 */
export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { refetchOnWindowFocus: false, retry: false },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    // Let React Query own caching; the router just triggers loads.
    defaultPreloadStaleTime: 0,
    // The surah reader restores by verse itself (see `useScrollPosition`).
    scrollRestoration: ({ location }) => !location.pathname.startsWith('/surah/'),
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  // Any navigation closes the dock's sheet, hash jumps included, before the
  // next page renders rather than a frame after.
  if (typeof window !== 'undefined') router.subscribe('onBeforeNavigate', closeDock);

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
