import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  clearScreen: false,
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    // Nitro picks the `vercel` preset automatically when building on Vercel.
    nitro({
      rolldownConfig: {
        // TanStack Router ships "use client" for RSC bundlers; harmless in the
        // server bundle, but Nitro's build warns once per module.
        onwarn(warning, warn) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
          warn(warning);
        },
      },
    }),
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
});
