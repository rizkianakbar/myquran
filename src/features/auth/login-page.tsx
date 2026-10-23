import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { requestPlanSync } from '#/features/plans/plans.hooks.ts';
import { authClient } from '#/lib/auth-client.ts';

export function LoginPage() {
  const navigate = useNavigate();
  // Prefill the seeded account (`bun db:seed`) in dev only.
  const [email, setEmail] = useState(import.meta.env.DEV ? 'test@example.com' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'password123' : '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || 'Login failed');
      } else {
        requestPlanSync();
        navigate({ to: '/' });
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main-content" className="flex min-w-0 grow items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl border bg-card p-8 text-card-foreground">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight">Noorish</h2>

          <p className="mt-2 text-center text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium ">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium ">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-2 disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          {import.meta.env.DEV && (
            <p className="text-center text-xs text-muted-foreground">
              Test credentials: test@example.com / password123
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
