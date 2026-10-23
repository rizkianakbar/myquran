/**
 * Pages scroll the document itself, not an inner element: only then does iOS
 * Safari shrink its toolbar and draw the page behind it. So scroll state is
 * `window.scrollY`, and scroll events fire on `window`.
 */
export function atPageEnd(): boolean {
  return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
}
