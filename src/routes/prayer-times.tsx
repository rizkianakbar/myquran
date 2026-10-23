import { createFileRoute } from '@tanstack/react-router';
import { PrayerTimesPage } from '#/features/prayer/prayer-times-page.tsx';

export const Route = createFileRoute('/prayer-times')({
  component: PrayerTimesPage,
});
