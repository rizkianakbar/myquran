import { createFileRoute } from '@tanstack/react-router';
import { PrayerQiblaPage } from '#/features/prayer/prayer-qibla-page.tsx';

export const Route = createFileRoute('/qibla')({
  component: PrayerQiblaPage,
});
