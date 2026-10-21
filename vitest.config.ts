import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts so tests don't boot the Start/Nitro plugins.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // .env, .env.local, .env.test, … — all variables, not just VITE_*.
    env: loadEnv('test', process.cwd(), ''),
  },
});
