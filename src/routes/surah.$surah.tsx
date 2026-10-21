import { createFileRoute, notFound } from '@tanstack/react-router';
import { ReaderLoadError, ReaderNotFound } from '#/features/reader/reader-fallbacks.tsx';
import { loadReaderFonts } from '#/features/reader/reader-fonts.lib.ts';
import { ReaderPage } from '#/features/reader/reader-page.tsx';
import { prefsStore } from '#/lib/prefs.ts';
import { chaptersQuery, getSurah, isValidSurah } from '#/lib/quran/data.ts';

export const Route = createFileRoute('/surah/$surah')({
  params: {
    parse: ({ surah }) => {
      const n = Number(surah);
      if (!isValidSurah(n)) throw notFound();
      return { surah: n };
    },
    stringify: ({ surah }) => ({ surah: String(surah) }),
  },
  // Wait only for the small chapter list (the header needs it). The surah and
  // the fonts are just started here, as early as a hover preload; the page
  // fades in when they land, so navigating never blocks on a large JSON file.
  loader: async ({ context, params }) => {
    void getSurah(params.surah).catch(() => {});
    void loadReaderFonts(prefsStore.get().arabicFont);
    await context.queryClient.ensureQueryData(chaptersQuery);
  },
  errorComponent: ReaderLoadError,
  notFoundComponent: ReaderNotFound,
  component: SurahRoute,
});

function SurahRoute() {
  const { surah } = Route.useParams();
  return <ReaderPage surah={surah} />;
}
