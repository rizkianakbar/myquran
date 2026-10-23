/**
 * Downloads the dua and dhikr collection into `public/duas/` as static JSON:
 * `index.json` (the categories) and one file per category, each entry in
 * English and Indonesian together.
 *
 * Source: Dua & Dhikr by Fitrahive (MIT), https://github.com/fitrahive/dua-dhikr
 *
 * Usage: `bun duas:fetch`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Dua, DuaCategory, DuaIndex } from '#/features/duas/duas.types.ts';

const SOURCE = 'https://raw.githubusercontent.com/fitrahive/dua-dhikr/main/data';
const OUT_DIR = join(import.meta.dirname, '../public/duas');
/**
 * The order the categories are offered in: the daily rhythm first.
 */
const ORDER = ['morning-dhikr', 'evening-dhikr', 'dhikr-after-salah', 'daily-dua', 'selected-dua'];

interface SourceDua {
  title: string;
  arabic: string;
  latin: string;
  translation: string;
  notes?: string;
  benefits?: string;
  fawaid?: string;
  source?: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

const clean = (text: string | undefined) => text?.trim() || null;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const names = await getJson<Record<'en' | 'id', { name: string; slug: string }[]>>(`${SOURCE}/core/categories.json`);
  const categories: DuaCategory[] = [];

  for (const slug of ORDER) {
    const [en, id] = await Promise.all([
      getJson<SourceDua[]>(`${SOURCE}/dua-dhikr/${slug}/en.json`),
      getJson<SourceDua[]>(`${SOURCE}/dua-dhikr/${slug}/id.json`),
    ]);
    if (en.length !== id.length) throw new Error(`${slug}: ${en.length} English entries, ${id.length} Indonesian`);

    const duas: Dua[] = en.map((e, i) => ({
      id: `${slug}-${i + 1}`,
      arabic: e.arabic.trim(),
      title: { en: e.title.trim(), id: id[i].title.trim() },
      latin: { en: e.latin.trim(), id: id[i].latin.trim() },
      translation: { en: e.translation.trim(), id: id[i].translation.trim() },
      notes: { en: clean(e.notes), id: clean(id[i].notes) },
      // The source names this field "benefits" in some categories and "fawaid" in others.
      benefits: { en: clean(e.benefits ?? e.fawaid), id: clean(id[i].benefits ?? id[i].fawaid) },
      source: { en: clean(e.source), id: clean(id[i].source) },
    }));
    await writeFile(join(OUT_DIR, `${slug}.json`), JSON.stringify(duas));

    const name = (lang: 'en' | 'id') => names[lang].find((c) => c.slug === slug)?.name ?? slug;
    categories.push({ slug, name: { en: name('en'), id: name('id') }, count: duas.length });
  }

  const index: DuaIndex = { categories };
  await writeFile(join(OUT_DIR, 'index.json'), JSON.stringify(index));
  console.log(`Done — ${categories.reduce((n, c) => n + c.count, 0)} duas in ${categories.length} categories`);
}

await main();
