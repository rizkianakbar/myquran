/**
 * Builds `src/features/hadith/hadith-index.json`: each collection's books and
 * which translations it has. Bundled, not under public/, because the server
 * names books in page titles (and Vite won't import from public/). The
 * hadith themselves stay on the source's CDN and
 * load a book at a time (see `src/features/hadith/hadith.api.ts`); every
 * collection in three languages would add 100+ MB to the repo.
 *
 * Source: hadith-api by Fawaz Ahmed (public domain, Unlicense),
 * https://github.com/fawazahmed0/hadith-api
 *
 * Usage: `bun hadith:fetch`
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { HADITH_CDN } from '#/features/hadith/hadith.lib.ts';
import type { HadithCollection, HadithIndex } from '#/features/hadith/hadith.types.ts';

const OUT_PATH = join(import.meta.dirname, '../src/features/hadith/hadith-index.json');

/**
 * The collections offered, in order: the short curated forties first, then
 * the six books and the Muwatta.
 */
const COLLECTIONS = [
  { slug: 'nawawi', featured: true },
  { slug: 'qudsi', featured: true },
  { slug: 'bukhari', featured: false },
  { slug: 'muslim', featured: false },
  { slug: 'abudawud', featured: false },
  { slug: 'tirmidhi', featured: false },
  { slug: 'nasai', featured: false },
  { slug: 'ibnmajah', featured: false },
  { slug: 'malik', featured: false },
];

interface Metadata {
  name: string;
  sections: Record<string, string>;
  section_details: Record<string, { hadithnumber_first: number; hadithnumber_last: number }>;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function main() {
  const [info, editions] = await Promise.all([
    getJson<Record<string, { metadata: Metadata; hadiths: { hadithnumber: number }[] }>>(`${HADITH_CDN}/info.min.json`),
    getJson<Record<string, { collection: { name: string }[] }>>(`${HADITH_CDN}/editions.min.json`),
  ]);

  const collections: HadithCollection[] = COLLECTIONS.map(({ slug, featured }) => {
    const { metadata, hadiths } = info[slug];
    const names = editions[slug].collection.map((edition) => edition.name);
    const books = Object.entries(metadata.section_details)
      .map(([number, detail]) => ({
        number: Number(number),
        name: metadata.sections[number] || metadata.name,
        first: detail.hadithnumber_first,
        last: detail.hadithnumber_last,
      }))
      // Section 0 is an empty placeholder in every collection.
      .filter((book) => book.last > 0);
    return {
      slug,
      name: metadata.name,
      featured,
      translations: (['en', 'id'] as const).filter((lang) =>
        names.includes(`${lang === 'en' ? 'eng' : 'ind'}-${slug}`),
      ),
      books,
      // Counted from the hadith list itself: books' number ranges overlap and skip
      // numbers, so summing them miscounts (Muslim's sum to twice its real size).
      count: hadiths.filter((h) => h.hadithnumber > 0).length,
    };
  });

  const index: HadithIndex = { collections };
  await writeFile(OUT_PATH, JSON.stringify(index));
  console.log(`Done — ${collections.length} collections, ${collections.reduce((n, c) => n + c.books.length, 0)} books`);
}

await main();
