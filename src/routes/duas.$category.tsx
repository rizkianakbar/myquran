import { createFileRoute, redirect } from '@tanstack/react-router';
import { categoryFromUrl } from '#/features/duas/duas.lib.ts';
import { DuasPage } from '#/features/duas/duas-page.tsx';

export const Route = createFileRoute('/duas/$category')({
  beforeLoad: ({ params }) => {
    if (!categoryFromUrl(params.category)) throw redirect({ to: '/duas', replace: true });
  },
  component: function DuaCategoryRoute() {
    return <DuasPage category={categoryFromUrl(Route.useParams().category)} />;
  },
});
