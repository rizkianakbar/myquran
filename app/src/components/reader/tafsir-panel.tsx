import { useQuery } from '@tanstack/react-query';
import { Maximize2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useT } from '#app/src/lib/i18n.ts';
import { usePrefs } from '#app/src/lib/prefs.ts';
import { getTafsir } from '#app/src/lib/quran/data.ts';
import type { TafsirSlug } from '#app/src/lib/quran/types.ts';
import { useIsPhone } from '#app/src/lib/use-media-query.ts';
import { Button } from '#assets/components/ui/button.tsx';
import { Drawer, DrawerContent, DrawerTitle } from '#assets/components/ui/drawer.tsx';
import { cn } from '#assets/lib/utils.ts';

interface Source {
  slug: TafsirSlug;
  label: string;
  html: boolean;
}

const IBN_KATHIR: Source = { slug: 'ibn-kathir', label: 'Ibn Kathir', html: true };
const KEMENAG: Source = { slug: 'kemenag', label: 'Tafsir Kemenag', html: false };

/**
 * No properly licensed Indonesian Ibn Kathir is available, so Indonesian
 * readers get Kemenag first with the English Ibn Kathir as a second source.
 */
const sourcesByLanguage = {
  en: [IBN_KATHIR],
  id: [KEMENAG, { ...IBN_KATHIR, label: 'Ibn Kathir (EN)' }],
};

const ALLOWED_TAGS = new Set([
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'STRONG',
  'B',
  'EM',
  'I',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'BR',
  'SPAN',
  'DIV',
  'SUP',
]);

/**
 * Keep structural tags, drop every attribute (inline colours fight the
 * theme) and unwrap anything not on the allowlist.
 */
function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const el of [...doc.body.querySelectorAll('*')].reverse()) {
    if (!ALLOWED_TAGS.has(el.tagName)) {
      el.replaceWith(...(el.tagName === 'SCRIPT' || el.tagName === 'STYLE' ? [] : el.childNodes));
      continue;
    }
    for (const attr of [...el.attributes]) el.removeAttribute(attr.name);
  }
  return doc.body.innerHTML;
}

function useTafsirEntry(source: Source, surah: number, verse: number) {
  return useQuery({
    queryKey: ['quran', 'tafsir', source.slug, surah, verse],
    staleTime: Infinity,
    queryFn: async () => {
      const data = await getTafsir(source.slug, surah);
      const entry = data.entries.find((e) => verse >= e.from && verse <= e.to);
      if (!entry) return null;
      return { ...entry, text: source.html ? sanitizeHtml(entry.text) : entry.text };
    },
  });
}

function TafsirBody({ source, surah, verse, large }: { source: Source; surah: number; verse: number; large: boolean }) {
  const t = useT();
  const { data: entry, isPending, isError } = useTafsirEntry(source, surah, verse);

  if (isPending) return <p className="py-2 text-sm text-muted-foreground">{t.tafsirLoading}</p>;
  if (isError) return <p className="py-2 text-sm text-destructive">{t.tafsirError}</p>;
  if (!entry) return <p className="py-2 text-sm text-muted-foreground">{t.tafsirNone}</p>;

  return (
    <div className="animate-in fade-in">
      {entry.from !== entry.to && (
        <p className="mb-2 text-xs font-medium text-muted-foreground">{t.tafsirCovers(entry.from, entry.to)}</p>
      )}
      {source.html ? (
        <div
          className={cn(
            'space-y-3 leading-relaxed [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-medium [&_li]:ml-5 [&_li]:list-disc [&_p:has(>:only-child:lang(ar))]:text-right',
            large ? 'text-base [&_h1]:text-lg [&_h2]:text-base' : 'text-sm [&_h1]:text-base [&_h2]:text-sm',
          )}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized above against a tag allowlist with all attributes removed
          dangerouslySetInnerHTML={{ __html: entry.text }}
        />
      ) : (
        <p className={cn('leading-relaxed whitespace-pre-line', large ? 'text-base' : 'text-sm')}>{entry.text}</p>
      )}
    </div>
  );
}

function SourceTabs({
  sources,
  selected,
  onSelect,
}: {
  sources: Source[];
  selected: Source;
  onSelect: (s: Source) => void;
}) {
  if (sources.length === 1)
    return <span className="px-1 text-xs font-semibold text-muted-foreground">{sources[0].label}</span>;
  return (
    <div role="tablist" className="flex gap-1">
      {sources.map((source) => (
        <button
          key={source.slug}
          type="button"
          role="tab"
          aria-selected={source.slug === selected.slug}
          onClick={() => onSelect(source)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
            source.slug === selected.slug && 'bg-highlight text-highlight-foreground hover:text-highlight-foreground',
          )}>
          {source.label}
        </button>
      ))}
    </div>
  );
}

export function TafsirPanel({ surah, verse }: { surah: number; verse: number }) {
  const t = useT();
  const { language } = usePrefs();
  const sources = sourcesByLanguage[language];
  const [selected, setSelected] = useState(sources[0]);
  const source = sources.find((s) => s.slug === selected.slug) ?? sources[0];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isPhone = useIsPhone();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const expand = () => (isPhone ? setDrawerOpen(true) : dialogRef.current?.showModal());

  return (
    <div className="mt-3 animate-in rounded-xl border bg-card fade-in slide-in-from-top-1">
      <div className="flex items-center gap-1 border-b px-3 py-2">
        <SourceTabs sources={sources} selected={source} onSelect={setSelected} />
        <span className="grow" />
        <Button variant="ghost" size="icon-sm" title={t.expand} aria-label={t.expand} onClick={expand}>
          <Maximize2 />
        </Button>
      </div>
      <div className="max-h-96 overflow-y-auto px-4 py-3">
        <TafsirBody source={source} surah={surah} verse={verse} large={false} />
      </div>

      <dialog
        ref={dialogRef}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
        onKeyDown={(e) => e.stopPropagation()}
        className="m-auto w-[min(48rem,calc(100vw-2rem))] rounded-2xl bg-popover text-popover-foreground shadow-2xl backdrop:bg-black/50">
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center gap-2 border-b px-5 py-3">
            <span className="mr-2 text-sm font-semibold">
              {t.tafsir}{' '}
              <span className="ml-1 font-normal text-gold-ink tabular-nums">
                {surah}:{verse}
              </span>
            </span>
            <SourceTabs sources={sources} selected={source} onSelect={setSelected} />
            <span className="grow" />
            <Button
              variant="ghost"
              size="icon-sm"
              title={t.close}
              aria-label={t.close}
              onClick={() => dialogRef.current?.close()}>
              <X />
            </Button>
          </div>
          <div className="overflow-y-auto px-6 py-5">
            <TafsirBody source={source} surah={surah} verse={verse} large />
          </div>
        </div>
      </dialog>

      {/* Phones get a swipeable drawer instead of a centred modal. */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} showSwipeHandle>
        <DrawerContent className="h-[88dvh] rounded-t-[1.75rem] border-gold/35 pb-[env(safe-area-inset-bottom)]">
          <div className="flex flex-wrap items-center gap-2 border-b px-5 pt-1 pb-3">
            <DrawerTitle className="mr-2 text-sm font-semibold">
              {t.tafsir}{' '}
              <span className="ml-1 font-normal text-gold-ink tabular-nums">
                {surah}:{verse}
              </span>
            </DrawerTitle>
            <SourceTabs sources={sources} selected={source} onSelect={setSelected} />
          </div>
          <div className="min-h-0 grow overflow-y-auto overscroll-contain px-5 py-5">
            <TafsirBody source={source} surah={surah} verse={verse} large />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
