import { createFileRoute, redirect } from '@tanstack/react-router';
import { authClient } from '../lib/auth';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    throw redirect({ to: session ? '/posts' : '/login' });
  },
  component: () => null,
});
