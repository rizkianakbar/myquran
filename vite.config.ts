import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  clearScreen: false,
  resolve: { tsconfigPaths: true },
  // Nitro picks the `vercel` preset automatically when building on Vercel.
  plugins: [devtools(), nitro(), tailwindcss(), tanstackStart(), react()],
});
