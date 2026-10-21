import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '#/lib/i18n.ts';
import type { Chapter } from '#/lib/quran/types.ts';

/**
 * Previous / next surah at the foot of the reader.
 */
export function ReaderSurahNav({ prev, next }: { prev: Chapter | undefined; next: Chapter | undefined }) {
  const t = useT();

  return (
    <nav className="mt-16 grid grid-cols-2 gap-3" aria-label="Surah navigation">
      {prev ? (
        <Link
          to="/surah/$surah"
          params={{ surah: prev.number }}
          className="group flex items-center gap-3 rounded-2xl border px-4 py-4 transition-colors hover:border-gold/60">
          <ChevronLeft className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">{t.previous}</span>
            <span className="block truncate font-serif">{prev.nameSimple}</span>
          </span>
          <span dir="rtl" lang="ar" className="ml-auto hidden font-kufi text-xl text-gold-ink sm:block">
            {prev.nameArabic}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          to="/surah/$surah"
          params={{ surah: next.number }}
          className="group flex items-center gap-3 rounded-2xl border px-4 py-4 text-right transition-colors hover:border-gold/60">
          <span dir="rtl" lang="ar" className="mr-auto hidden font-kufi text-xl text-gold-ink sm:block">
            {next.nameArabic}
          </span>
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">{t.next}</span>
            <span className="block truncate font-serif">{next.nameSimple}</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </nav>
  );
}
