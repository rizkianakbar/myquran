import type { AnyRouteMatch } from '@tanstack/react-router';
import chapters from './quran/chapters.json' with { type: 'json' };
import type { Chapter } from './quran/types.ts';

/**
 * Per-page <head> for search engines and link previews. Route components
 * render on the client (see `src/start.ts`), so only the root route's
 * `head()` runs on the server: it builds every page's tags from the matched
 * route, and the chapter names are bundled so server and client agree.
 */
export const SITE_URL = 'https://noorish.rzknkbr.xyz';
const SITE_NAME = 'Noorish';

// 'and', not '&': link-preview tools count the escaped `&amp;` against the ~60 limit.
const HOME_TITLE = 'Noorish: Read the Quran Word by Word, with Tafsir and Audio';
const HOME_DESCRIPTION =
  'Read all 114 surahs of the Quran in Arabic with word-by-word meanings, English and Indonesian translations, Ibn Kathir tafsir, and verse-by-verse recitation.';
/**
 * Link previews show ~125 characters, fewer than search results.
 */
const HOME_SOCIAL_DESCRIPTION =
  'Read all 114 surahs in Arabic, word by word, with English and Indonesian translations, Ibn Kathir tafsir and recitation.';
/**
 * 1200×630 (1.91:1), the size Facebook, X, LinkedIn and chat apps expect.
 */
const OG_IMAGE = {
  url: `${SITE_URL}/og.jpg`,
  width: '1200',
  height: '630',
  alt: 'Noorish: read the Quran, word by word',
};

type Head = {
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string>>;
  scripts: Array<{ type: string; children: string }>;
};

function jsonLd(data: object) {
  return { type: 'application/ld+json', children: JSON.stringify({ '@context': 'https://schema.org', ...data }) };
}

function page({
  title,
  description,
  socialDescription,
  path,
}: {
  title: string;
  description: string;
  socialDescription: string;
  path: string;
}): Omit<Head, 'scripts'> & { url: string } {
  const url = `${SITE_URL}${path}`;
  return {
    url,
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:title', content: title },
      { property: 'og:description', content: socialDescription },
      { property: 'og:url', content: url },
      { property: 'og:image', content: OG_IMAGE.url },
      { property: 'og:image:width', content: OG_IMAGE.width },
      { property: 'og:image:height', content: OG_IMAGE.height },
      { property: 'og:image:alt', content: OG_IMAGE.alt },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'canonical', href: url }],
  };
}

function homeHead(): Head {
  const { meta, links } = page({
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    socialDescription: HOME_SOCIAL_DESCRIPTION,
    path: '/',
  });
  return {
    meta,
    links,
    scripts: [
      jsonLd({
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: `${SITE_URL}/`,
            name: SITE_NAME,
            description: HOME_DESCRIPTION,
            inLanguage: ['en', 'id'],
          },
          {
            '@type': 'WebApplication',
            '@id': `${SITE_URL}/#app`,
            url: `${SITE_URL}/`,
            name: SITE_NAME,
            description: HOME_DESCRIPTION,
            applicationCategory: 'ReferenceApplication',
            operatingSystem: 'Any',
            browserRequirements: 'Requires JavaScript',
            image: `${SITE_URL}/apple-touch-icon.png`,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          },
        ],
      }),
    ],
  };
}

function surahHead(chapter: Chapter): Head {
  const place = chapter.revelationPlace === 'makkah' ? 'Meccan' : 'Medinan';
  const title = `Surah ${chapter.nameSimple} (${chapter.number}) – ${chapter.nameEn}, Word by Word | ${SITE_NAME}`;
  const description = `Read Surah ${chapter.nameSimple} (${chapter.nameArabic}), “${chapter.nameEn}”, a ${place} surah of ${chapter.versesCount} verses, in Arabic with word-by-word meanings, translation, Ibn Kathir tafsir, and recitation.`;
  const socialDescription = `Surah ${chapter.nameSimple}, “${chapter.nameEn}”: ${chapter.versesCount} verses, word by word, with tafsir and recitation.`;
  const { url, meta, links } = page({ title, description, socialDescription, path: `/surah/${chapter.number}` });
  return {
    meta,
    links,
    scripts: [
      jsonLd({
        '@graph': [
          {
            '@type': 'Chapter',
            '@id': `${url}#chapter`,
            url,
            name: `Surah ${chapter.nameSimple}`,
            alternateName: [chapter.nameArabic, chapter.nameEn],
            position: chapter.number,
            description,
            inLanguage: 'ar',
            isPartOf: { '@type': 'Book', name: 'The Quran', inLanguage: 'ar' },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
              { '@type': 'ListItem', position: 2, name: `Surah ${chapter.nameSimple}`, item: url },
            ],
          },
        ],
      }),
    ],
  };
}

const noindex: Head = {
  meta: [{ title: SITE_NAME }, { name: 'robots', content: 'noindex' }],
  links: [],
  scripts: [],
};

/**
 * Tags for the deepest match: the home page and real surahs are indexable;
 * login, settings and not-found pages are not.
 */
export function pageHead(matches: AnyRouteMatch[]): Head {
  const leaf = matches.at(-1);
  if (!leaf || leaf.status === 'notFound') return noindex;
  if (leaf.routeId === '/') return homeHead();
  if (leaf.routeId === '/surah/$surah') {
    const chapter = (chapters as Chapter[])[Number(leaf.params.surah) - 1];
    if (chapter) return surahHead(chapter);
  }
  // Settings titles itself in the reader's language.
  if (leaf.routeId === '/settings') return { ...noindex, meta: noindex.meta.filter((tag) => !('title' in tag)) };
  return noindex;
}
