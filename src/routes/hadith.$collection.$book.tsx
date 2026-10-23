import { createFileRoute } from '@tanstack/react-router';
import { HadithBookPage } from '#/features/hadith/hadith-pages.tsx';

export const Route = createFileRoute('/hadith/$collection/$book')({
  component: function HadithBookRoute() {
    const { collection, book } = Route.useParams();
    return <HadithBookPage key={`${collection}/${book}`} slug={collection} book={Number(book)} />;
  },
});
