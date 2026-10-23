import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import type { ReactNode } from 'react';
import { AppShell } from '#/components/app-shell.tsx';
import { IOS_SPLASH_SCREENS } from '#/features/pwa/pwa-screens.ts';
import { SPLASH_CSS, SPLASH_STAR } from '#/features/pwa/pwa-splash.ts';
import { arabicFontFiles, criticalFontFiles } from '#/lib/fonts.ts';
import { pageHead } from '#/lib/seo.ts';
import appCss from '#/styles.css?url';

export interface RouterContext {
  queryClient: QueryClient;
}

/**
 * Applies the saved theme before first paint so dark-mode readers don't get
 * a white flash while the app boots. Mirrors `useApplyPrefs` in app-shell.
 * It also preloads the reader's chosen Arabic font, which only the prefs know.
 */
const prefsScript = `try{var p=JSON.parse(localStorage.getItem('quran:prefs')||'{}'),t=p.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'),r=document.documentElement;r.dataset.theme=t;r.classList.toggle('dark',t==='dark'||t==='night');var f=${JSON.stringify(arabicFontFiles)}[p.arabicFont]||${JSON.stringify(arabicFontFiles.amiri)},l=document.createElement('link');l.rel='preload';l.as='font';l.type='font/woff2';l.crossOrigin='';l.href=f;document.head.appendChild(l)}catch(e){}`;

export const Route = createRootRouteWithContext<RouterContext>()({
  // Child routes render on the client only, so their head() never reaches
  // the server HTML; the root builds every page's title and tags instead.
  head: ({ matches }) => {
    const page = pageHead(matches);
    return {
      meta: [
        { charSet: 'utf-8' },
        // resizes-content: Android shrinks the page for the keyboard instead of covering it.
        // viewport-fit=cover: the page runs under iOS Safari's toolbar and the home indicator
        // instead of stopping above them; bottom-anchored UI pads itself with safe-area insets.
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content',
        },
        ...page.meta,
        { name: 'theme-color', content: '#1b2a4e' },
        // The name under the Home Screen icon on iOS.
        { name: 'apple-mobile-web-app-title', content: 'Noorish' },
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        // Fonts need `crossorigin` even same-origin, or the preload goes unused.
        ...criticalFontFiles.map((href) => ({
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          crossOrigin: 'anonymous' as const,
          href,
        })),
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        // iOS launch screens, one per screen size; the same art as the in-app splash.
        ...IOS_SPLASH_SCREENS.map(({ file, media }) => ({ rel: 'apple-touch-startup-image', href: file, media })),
        ...page.links,
      ],
      scripts: [{ children: prefsScript }, ...page.scripts],
    };
  },
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
      <body className="bg-background antialiased" suppressHydrationWarning>
        {/* First frame of the installed app (see `pwa-splash.ts`); faded out by the app shell. */}
        <style>{SPLASH_CSS}</style>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static markup from our own constant */}
        <div id="splash" aria-hidden="true" dangerouslySetInnerHTML={{ __html: SPLASH_STAR }} />
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
