/**
 * The installed app's splash: the lapis ground and the star from the icon.
 * The same markup draws the in-app splash (in the document shell, so it is
 * the first frame painted) and the iOS launch images (`bun pwa:splash`), so
 * the hand-off from the system's launch screen to the page can't be seen.
 */

export const SPLASH_STAR = `<svg viewBox="0 0 64 64" width="112" height="112" aria-hidden="true"><path d="M32 1 36.97 6.99 43.86 3.36 46.17 10.8 53.92 10.08 53.2 17.83 60.64 20.14 57.01 27.03 63 32 57.01 36.97 60.64 43.86 53.2 46.17 53.92 53.92 46.17 53.2 43.86 60.64 36.97 57.01 32 63 27.03 57.01 20.14 60.64 17.83 53.2 10.08 53.92 10.8 46.17 3.36 43.86 6.99 36.97 1 32 6.99 27.03 3.36 20.14 10.8 17.83 10.08 10.08 17.83 10.8 20.14 3.36 27.03 6.99Z" fill="#1b2a4e" stroke="#d4a94a" stroke-width="2.4" stroke-linejoin="round"/><path d="M38.51 16.29 40.13 23.87 47.71 25.49 43.5 32 47.71 38.51 40.13 40.13 38.51 47.71 32 43.5 25.49 47.71 23.87 40.13 16.29 38.51 20.5 32 16.29 25.49 23.87 23.87 25.49 16.29 32 20.5Z" fill="#d4a94a"/><circle cx="32" cy="32" r="4" fill="#1b2a4e"/></svg>`;

/**
 * Hidden in a browser tab, where the page itself is the first thing seen;
 * shown in the installed app: `display-mode: standalone`, or the
 * `standalone` class the theme script in `__root.tsx` sets from Safari's
 * `navigator.standalone` (iOS doesn't always report the display mode).
 * A flat ground, not a gradient: iOS launch images must be PNG, and a
 * gradient makes each one ~1 MB. On iOS the page starts below the status
 * bar but the launch image fills the screen, so the splash reaches up by
 * the bar's height (`--splash-shift`, measured in `__root.tsx`) to centre
 * the star on the screen, exactly where the launch image has it. Leaving: the
 * ground fades while the star drifts larger and fades a little sooner, like
 * a native launch, then the whole layer stops hit-testing and painting.
 */
export const SPLASH_CSS = `
#splash{position:fixed;inset:0;top:calc(-1*var(--splash-shift,0px));z-index:100;display:none;place-items:center;background:#1b2a4e}
#splash svg{filter:drop-shadow(0 0 28px rgb(212 169 74/.28))}
@media (display-mode:standalone){#splash{display:grid}}
.standalone #splash{display:grid}
#splash[data-state=out]{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .42s cubic-bezier(.4,0,.2,1),visibility 0s linear .42s}
#splash[data-state=out] svg{transform:scale(1.12);opacity:0;transition:transform .42s cubic-bezier(.2,0,0,1),opacity .3s cubic-bezier(.4,0,1,1)}
@media (prefers-reduced-motion:reduce){#splash[data-state=out],#splash[data-state=out] svg{transition-duration:.15s;transform:none}}
`;

/**
 * Longest the splash waits for the page and then its fonts; past that the
 * page shows as it is rather than keep the reader waiting.
 */
const PAGE_WAIT_MS = 3000;
const FONT_WAIT_MS = 1200;

/**
 * Resolves once the page component has rendered: route code loads on its
 * own, so the app frame can mount before the page inside it exists.
 */
function pageRendered(): Promise<void> {
  const started = performance.now();
  return new Promise((resolve) => {
    const check = () => {
      if (document.getElementById('main-content') || performance.now() - started > PAGE_WAIT_MS) resolve();
      else requestAnimationFrame(check);
    };
    check();
  });
}

let leaving = false;

/**
 * Fade the splash out once the page under it is ready: rendered, fonts
 * loaded (so nothing reflows mid-fade) and a frame painted. Safe to call
 * more than once.
 */
export function hideSplash() {
  const splash = document.getElementById('splash');
  if (!splash || leaving) return;
  leaving = true;
  if (getComputedStyle(splash).display === 'none') return;

  void pageRendered()
    .then(() => Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS))]))
    .then(() => {
      // Two frames: the first lets the page paint under the splash, the
      // second starts the fade from a settled frame instead of mid-layout.
      requestAnimationFrame(() => requestAnimationFrame(() => (splash.dataset.state = 'out')));
    });
}
