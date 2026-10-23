/**
 * Writes `public/sitemap.xml` and `public/robots.txt`. The sitemap lists every
 * indexable page: home, the 114 surahs, the duas and their categories, and
 * the hadith collections and books, built from the same data the pages use.
 * Personal tools (prayer times, qibla, memorize) and settings are noindex
 * and left out (see `pageHead` in `src/lib/seo.ts`).
 *
 * Usage: `bun seo:generate`. Rerun after `bun duas:fetch` or `bun hadith:fetch`
 * (new categories or books), or if `SITE_URL` changes.
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DUA_URL_SLUGS } from '#/features/duas/duas.lib.ts';
import type { DuaIndex } from '#/features/duas/duas.types.ts';
import duaIndexJson from '#/features/duas/duas-index.json' with { type: 'json' };
import type { HadithIndex } from '#/features/hadith/hadith.types.ts';
import hadithIndexJson from '#/features/hadith/hadith-index.json' with { type: 'json' };
import { SITE_URL } from '#/lib/seo.ts';

const PUBLIC_DIR = join(import.meta.dirname, '../public');
const duaIndex = duaIndexJson as DuaIndex;
const hadithIndex = hadithIndexJson as HadithIndex;

const paths = [
  '/',
  ...Array.from({ length: 114 }, (_, i) => `/surah/${i + 1}`),
  '/duas',
  ...duaIndex.categories.map((c) => `/duas/${DUA_URL_SLUGS[c.slug]}`),
  '/hadith',
  ...hadithIndex.collections.flatMap((c) =>
    // A one-book collection (the forties) lives at its book's URL; its own redirects there.
    c.books.length === 1
      ? [`/hadith/${c.slug}/${c.books[0].number}`]
      : [`/hadith/${c.slug}`, ...c.books.map((b) => `/hadith/${c.slug}/${b.number}`)],
  ),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`).join('\n')}
</urlset>
`;

// /quran/ and /duas/ stay crawlable: pages fetch their text from them while rendering.
// Login and settings are left open so crawlers can see their noindex.
const robots = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`;

await writeFile(join(PUBLIC_DIR, 'sitemap.xml'), sitemap);
await writeFile(join(PUBLIC_DIR, 'robots.txt'), robots);
console.log(`Wrote sitemap.xml (${paths.length} URLs) and robots.txt`);
