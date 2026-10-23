import { createFileRoute } from '@tanstack/react-router';
import { HadithCollectionPage } from '#/features/hadith/hadith-pages.tsx';

export const Route = createFileRoute('/hadith/$collection/')({
  component: function HadithCollectionRoute() {
    return <HadithCollectionPage slug={Route.useParams().collection} />;
  },
});
