import { createFileRoute } from '@tanstack/react-router';
import { DuasPage } from '#/features/duas/duas-page.tsx';

export const Route = createFileRoute('/duas')({
  validateSearch: (search: Record<string, unknown>): { category?: string } => ({
    category: typeof search.category === 'string' ? search.category : undefined,
  }),
  component: function DuasRoute() {
    return <DuasPage category={Route.useSearch().category} />;
  },
});
