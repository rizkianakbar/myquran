import { createFileRoute } from '@tanstack/react-router';
import { MemorizePage, type MemorizeSearch } from '#/features/memorize/memorize-page.tsx';

function positiveInt(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export const Route = createFileRoute('/memorize')({
  validateSearch: (search: Record<string, unknown>): MemorizeSearch => ({
    surah: positiveInt(search.surah),
    from: positiveInt(search.from),
    to: positiveInt(search.to),
    mode: search.mode === 'review' ? 'review' : undefined,
  }),
  component: function MemorizeRoute() {
    return <MemorizePage search={Route.useSearch()} />;
  },
});
