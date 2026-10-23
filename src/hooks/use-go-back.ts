import { useNavigate, useRouter } from '@tanstack/react-router';

/**
 * Back to wherever this page was opened from; Home when it was opened
 * directly (a fresh tab or a pasted link has no in-app history).
 */
export function useGoBack() {
  const router = useRouter();
  const navigate = useNavigate();
  return () => (router.history.canGoBack() ? router.history.back() : navigate({ to: '/' }));
}
