import { createFileRoute } from '@tanstack/react-router';
import { HadithHome } from '#/features/hadith/hadith-pages.tsx';

export const Route = createFileRoute('/hadith/')({
  component: HadithHome,
});
