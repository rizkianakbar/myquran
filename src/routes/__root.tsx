import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import type { ReactNode } from 'react';
import { AppShell } from '#/components/app-shell.tsx';
import appCss from '#/styles.css?url';

export interface RouterContext {
  queryClient: QueryClient;
}

/**
 * Applies the saved theme before first paint so dark-mode readers don't get
 * a white flash while the app boots. Mirrors `useApplyPrefs` in app-shell.
 */
const themeScript = `try{var p=JSON.parse(localStorage.getItem('quran:prefs')||'{}'),t=p.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'),r=document.documentElement;r.dataset.theme=t;r.classList.toggle('dark',t==='dark'||t==='night')}catch(e){}`;

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      // resizes-content: Android shrinks the page for the keyboard instead of covering it.
      { name: 'viewport', content: 'width=device-width, initial-scale=1, interactive-widget=resizes-content' },
      { title: 'myQuran' },
      { name: 'description', content: 'A calm Quran reader with word-by-word meanings, tafsir, and recitation.' },
      { name: 'theme-color', content: '#1b2a4e' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    ],
    scripts: [{ children: themeScript }],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
});

/**
 * The HTML document. Always server-rendered, even though route components
 * render on the client (see `defaultSsr` in `src/start.ts`).
 */
function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      {/* Extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes to <body> before hydration. */}
      <body className="min-h-screen bg-background antialiased" suppressHydrationWarning>
        {children}
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              { name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel /> },
              { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel /> },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
