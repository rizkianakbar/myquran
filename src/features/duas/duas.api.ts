import { queryOptions } from '@tanstack/react-query';
import type { Dua, DuaIndex } from './duas.types.ts';

/**
 * Static JSON under /duas (built by `bun duas:fetch`); small, and kept
 * offline by the service worker once seen.
 */
async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export const duaQueries = {
  index: () =>
    queryOptions({
      queryKey: ['duas', 'index'],
      queryFn: () => getJson<DuaIndex>('/duas/index.json'),
      staleTime: Number.POSITIVE_INFINITY,
    }),
  category: (slug: string) =>
    queryOptions({
      queryKey: ['duas', slug],
      queryFn: () => getJson<Dua[]>(`/duas/${slug}.json`),
      staleTime: Number.POSITIVE_INFINITY,
    }),
};
