import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Fonts worth having offline: the Latin, Latin Extended (transliteration
 * marks) and Arabic faces. Cyrillic, Greek and Vietnamese subsets the app
 * never draws are left to load on demand.
 */
const OFFLINE_FONT = /-(latin|latin-ext|arabic)-.*normal.*\.woff2$/;

/**
 * Emits `/sw.js` from `pwa.sw.js` with this build's file list, so the
 * worker caches exactly the files the build produced. Client build only;
 * dev has no service worker.
 */
export function pwa(): Plugin {
  let root = process.cwd();
  return {
    name: 'noorish:pwa',
    apply: 'build',
    applyToEnvironment: (environment) => environment.name === 'client',
    configResolved(config) {
      root = config.root;
    },
    generateBundle(_, bundle) {
      const files = Object.keys(bundle)
        .filter((file) => /\.(js|css)$/.test(file) || OFFLINE_FONT.test(file))
        .sort()
        .map((file) => `/${file}`);
      const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 12);
      const source = readFileSync(join(root, 'src/features/pwa/pwa.sw.js'), 'utf8')
        .replace("'__VERSION__'", JSON.stringify(version))
        .replace('__PRECACHE__', JSON.stringify(files));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
