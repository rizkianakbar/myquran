import type { AnyRouteMatch } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { pageHead, SITE_URL } from './seo.ts';

/** A matched route, as the root head sees it. */
const at = (routeId: string, params: Record<string, string> = {}) =>
  pageHead([{ routeId, params, status: 'success' } as unknown as AnyRouteMatch]);

const title = (head: ReturnType<typeof pageHead>) => head.meta.find((m) => 'title' in m)?.title;
const canonical = (head: ReturnType<typeof pageHead>) => head.links.find((l) => l.rel === 'canonical')?.href;
const noindex = (head: ReturnType<typeof pageHead>) => head.meta.some((m) => m.name === 'robots');

describe('pageHead for duas and hadith', () => {
  it('titles a dua category in both languages at its clean URL', () => {
    const head = at('/duas/$category', { category: 'dzikir-pagi' });
    expect(title(head)).toBe('Dzikir Pagi (Morning Dhikr): Arab, Latin & Arti | Noorish');
    expect(canonical(head)).toBe(`${SITE_URL}/duas/dzikir-pagi`);
    expect(noindex(head)).toBe(false);
  });

  it('titles a hadith book with its collection', () => {
    const head = at('/hadith/$collection/$book', { collection: 'bukhari', book: '30' });
    expect(title(head)).toMatch(/: Shahih al-Bukhari \| Noorish$/);
    expect(canonical(head)).toBe(`${SITE_URL}/hadith/bukhari/30`);
    expect(noindex(head)).toBe(false);
  });

  it('points a one-book collection at its book', () => {
    const head = at('/hadith/$collection/', { collection: 'nawawi' });
    expect(canonical(head)).toBe(`${SITE_URL}/hadith/nawawi/1`);
    expect(title(head)).toMatch(/^Hadis Arbain an-Nawawi \(An-Nawawi’s Forty\)/);
  });

  it('keeps unknown pages and personal tools out of search', () => {
    expect(noindex(at('/duas/$category', { category: 'nope' }))).toBe(true);
    expect(noindex(at('/hadith/$collection/$book', { collection: 'bukhari', book: '9999' }))).toBe(true);
    expect(noindex(at('/prayer-times'))).toBe(true);
    expect(noindex(at('/memorize'))).toBe(true);
  });
});
