import { createFileRoute, redirect } from '@tanstack/react-router';
import { LoginPage } from '#/features/auth/login-page.tsx';
import { getSession } from '#/server/auth.functions.ts';

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    if (await getSession()) throw redirect({ to: '/' });
  },
  component: LoginPage,
});
