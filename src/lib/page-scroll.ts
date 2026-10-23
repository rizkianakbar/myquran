/**
 * Pages scroll the document itself, not an inner element. Only then does
 * iOS Safari shrink its toolbar and draw the page behind it (an inner
 * scroller leaves a solid strip under the toolbar), and a tap on the status
 * bar scrolls back to the top. Scroll events fire on `window`.
 */
export function pageScroller(): HTMLElement {
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

/**
 * Whether the page is scrolled to (within a few px of) its end.
 */
export function atPageEnd(): boolean {
  const page = pageScroller();
  return page.scrollTop + window.innerHeight >= page.scrollHeight - 4;
}
