/**
 * Writes `public/sitemap.xml` and `public/robots.txt`: the home page plus
 * all 114 surahs. The URL set is fixed, so the output is committed.
 *
 * Usage: `bun seo:generate` (rerun only if `SITE_URL` changes).
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SITE_URL } from '#/lib/seo.ts';

const PUBLIC_DIR = join(import.meta.dirname, '../public');

const paths = ['/', ...Array.from({ length: 114 }, (_, i) => `/surah/${i + 1}`)];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`).join('\n')}
</urlset>
`;

// /quran/ stays crawlable: pages fetch their text from it while rendering.
// Login and settings are left open so crawlers can see their noindex.
const robots = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`;

await writeFile(join(PUBLIC_DIR, 'sitemap.xml'), sitemap);
await writeFile(join(PUBLIC_DIR, 'robots.txt'), robots);
console.log(`Wrote sitemap.xml (${paths.length} URLs) and robots.txt`);
