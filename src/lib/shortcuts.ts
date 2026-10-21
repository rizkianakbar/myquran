import { useEffect, useRef } from 'react';

/**
 * Every keyboard shortcut in the app, defined once. The same list drives
 * key handling, the `?` help sheet, and the settings page, so they can't
 * drift apart.
 */
export type ShortcutId =
  | 'playPause'
  | 'stop'
  | 'prevRecited'
  | 'nextRecited'
  | 'returnToRecitation'
  | 'slower'
  | 'faster'
  | 'nextVerse'
  | 'prevVerse'
  | 'nextSurah'
  | 'prevSurah'
  | 'focusMode'
  | 'latin'
  | 'biggerText'
  | 'smallerText'
  | 'versePlay'
  | 'verseTafsir'
  | 'verseCopy'
  | 'verseBookmark'
  | 'verseNote'
  | 'surahIndex'
  | 'search'
  | 'journal'
  | 'home'
  | 'settings'
  | 'help'
  | 'close';

export type ShortcutGroup = 'playback' | 'reading' | 'verse' | 'app';

export interface Shortcut {
  id: ShortcutId;
  group: ShortcutGroup;
  /**
   * Key caps as shown to people, one entry per alternative.
   */
  keys: string[];
  /**
   * Shortcuts without a matcher are handled locally (on a focused verse)
   * and only listed here for the help sheet.
   */
  match?: (event: KeyboardEvent) => boolean;
  /**
   * Fire even while typing in a field.
   */
  inInputs?: boolean;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

const bare =
  (...keys: string[]) =>
  (e: KeyboardEvent) =>
    !e.metaKey && !e.ctrlKey && !e.altKey && keys.includes(e.key);
const withMod = (key: string) => (e: KeyboardEvent) =>
  (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === key;

export const shortcuts: Shortcut[] = [
  { id: 'playPause', group: 'playback', keys: ['Space'], match: bare(' ') },
  { id: 'stop', group: 'playback', keys: ['S'], match: bare('s') },
  { id: 'prevRecited', group: 'playback', keys: ['←'], match: bare('ArrowLeft') },
  { id: 'nextRecited', group: 'playback', keys: ['→'], match: bare('ArrowRight') },
  { id: 'returnToRecitation', group: 'playback', keys: ['R'], match: bare('r') },
  { id: 'slower', group: 'playback', keys: ['<'], match: bare('<') },
  { id: 'faster', group: 'playback', keys: ['>'], match: bare('>') },

  { id: 'nextVerse', group: 'reading', keys: ['J'], match: bare('j') },
  { id: 'prevVerse', group: 'reading', keys: ['K'], match: bare('k') },
  { id: 'nextSurah', group: 'reading', keys: [']'], match: bare(']') },
  { id: 'prevSurah', group: 'reading', keys: ['['], match: bare('[') },
  { id: 'focusMode', group: 'reading', keys: ['F'], match: bare('f') },
  { id: 'latin', group: 'reading', keys: ['L'], match: bare('l') },
  { id: 'biggerText', group: 'reading', keys: ['+'], match: bare('+', '=') },
  { id: 'smallerText', group: 'reading', keys: ['−'], match: bare('-', '_') },

  { id: 'versePlay', group: 'verse', keys: ['P'] },
  { id: 'verseTafsir', group: 'verse', keys: ['T'] },
  { id: 'verseCopy', group: 'verse', keys: ['C'] },
  { id: 'verseBookmark', group: 'verse', keys: ['B'] },
  { id: 'verseNote', group: 'verse', keys: ['N'] },

  { id: 'surahIndex', group: 'app', keys: [`${MOD} B`], match: withMod('b'), inInputs: true },
  {
    id: 'search',
    group: 'app',
    keys: [`${MOD} K`, '/'],
    match: (e) => withMod('k')(e) || withMod('f')(e) || bare('/')(e),
  },
  { id: 'journal', group: 'app', keys: [`${MOD} J`], match: withMod('j'), inInputs: true },
  { id: 'home', group: 'app', keys: ['H'], match: bare('h') },
  { id: 'settings', group: 'app', keys: [','], match: bare(',') },
  { id: 'help', group: 'app', keys: ['?'], match: bare('?') },
  { id: 'close', group: 'app', keys: ['Esc'], match: bare('Escape'), inInputs: true },
];

export const shortcutGroups: ShortcutGroup[] = ['playback', 'reading', 'verse', 'app'];

type Handler = (event: KeyboardEvent) => void;

/**
 * Handlers stack per shortcut. Priority decides rather than mount order —
 * React mounts children before parents, so the app shell would otherwise
 * shadow a page that refines a shortcut (the reader turns Space into "play
 * this surah" when nothing is loaded).
 */
export type ShortcutScope = 'global' | 'page';
const SCOPE_RANK: Record<ShortcutScope, number> = { global: 0, page: 1 };
type Binding = { handler: Handler; rank: number };
const handlers = new Map<ShortcutId, Binding[]>();

function activeHandler(id: ShortcutId): Handler | undefined {
  const bindings = handlers.get(id);
  if (!bindings?.length) return undefined;
  return bindings.reduce((best, b) => (b.rank >= best.rank ? b : best)).handler;
}

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && !!target.closest('input, textarea, select, [contenteditable]');
}

function isOverlayOpen(target: EventTarget | null) {
  return target instanceof HTMLElement && !!target.closest('dialog[open]');
}

let spaceHandledOnButton = false;

function onKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing) return;
  for (const shortcut of shortcuts) {
    if (!shortcut.match?.(event)) continue;
    if (!shortcut.inInputs && (isTyping(event.target) || isOverlayOpen(event.target))) return;
    const handler = activeHandler(shortcut.id);
    if (!handler) continue;
    event.preventDefault();
    // A focused button would otherwise also "click" on Space keyup.
    spaceHandledOnButton = event.key === ' ' && event.target instanceof HTMLElement && !!event.target.closest('button');
    handler(event);
    return;
  }
}

function onKeyUp(event: KeyboardEvent) {
  if (event.key === ' ' && spaceHandledOnButton) {
    event.preventDefault();
    spaceHandledOnButton = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp, true);
}

/**
 * Bind a handler to a shortcut while the component is mounted. The latest
 * handler is always called, so it may close over fresh state.
 */
export function useShortcut(id: ShortcutId, handler: Handler, opts: { scope?: ShortcutScope; enabled?: boolean } = {}) {
  const { scope = 'global', enabled = true } = opts;
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const binding: Binding = { handler: (event) => latest.current(event), rank: SCOPE_RANK[scope] };
    handlers.set(id, [...(handlers.get(id) ?? []), binding]);
    return () => {
      handlers.set(
        id,
        (handlers.get(id) ?? []).filter((b) => b !== binding),
      );
    };
  }, [id, scope, enabled]);
}
