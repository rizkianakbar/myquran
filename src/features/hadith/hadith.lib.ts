import { matchesAll, normalizeArabic, type ParsedQuery } from '#/features/search/search.lib.ts';
import type { Hadith, HadithBook, HadithCollection } from './hadith.types.ts';

/**
 * hadith-api on jsDelivr (public domain): CORS-open, cached a week, and
 * served a book ("section") at a time. Pinned to the major version, so its
 * shape can't change under us.
 */
export const HADITH_CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1';

/**
 * Each collection's name in Arabic, set in Kufi beside its English one.
 */
export const ARABIC_COLLECTION_NAMES: Record<string, string> = {
  nawawi: 'الأربعون النووية',
  qudsi: 'الأحاديث القدسية',
  bukhari: 'صحيح البخاري',
  muslim: 'صحيح مسلم',
  abudawud: 'سنن أبي داود',
  tirmidhi: 'جامع الترمذي',
  nasai: 'سنن النسائي',
  ibnmajah: 'سنن ابن ماجه',
  malik: 'موطأ مالك',
};

/**
 * Book titles exist only in English, so common Indonesian topic words also
 * look for their English title words: "hadis makan" finds the books on Food.
 * Stems, matched inside words ("pray" finds "Prayers").
 */
const TOPICS: Record<string, string[]> = {
  makan: ['food', 'eat', 'meal'],
  makanan: ['food', 'eat'],
  minum: ['drink'],
  minuman: ['drink'],
  shalat: ['prayer', 'salat'],
  salat: ['prayer', 'salat'],
  sholat: ['prayer', 'salat'],
  solat: ['prayer', 'salat'],
  puasa: ['fasting', 'fasts', 'saum', 'sawm'],
  zakat: ['zakat'],
  sedekah: ['charity', 'sadaqa'],
  haji: ['hajj', 'pilgrim'],
  umrah: ['umrah'],
  nikah: ['marriage', 'nikah', 'wedlock'],
  menikah: ['marriage', 'nikah'],
  talak: ['divorce', 'talaq'],
  cerai: ['divorce'],
  wudhu: ['ablution', 'wudu', 'purif'],
  wudu: ['ablution', 'wudu', 'purif'],
  bersuci: ['purif', 'taharah'],
  mandi: ['bath', 'ghusl'],
  jual: ['sale', 'trade', 'business'],
  beli: ['sale', 'trade', 'business'],
  ilmu: ['knowledge'],
  adab: ['manners', 'etiquette', 'adab'],
  akhlak: ['manners', 'character'],
  jenazah: ['funeral'],
  iman: ['belief', 'faith', 'iman'],
  tobat: ['repent'],
  taubat: ['repent'],
  pakaian: ['dress', 'cloth'],
  tidur: ['sleep'],
  mimpi: ['dream'],
  waris: ['inherit'],
  warisan: ['inherit'],
  sumpah: ['oath', 'vow'],
  kurban: ['sacrifice'],
  qurban: ['sacrifice'],
  hutang: ['loan', 'debt'],
  utang: ['loan', 'debt'],
  riba: ['usury', 'riba'],
  jihad: ['jihad'],
  doa: ['supplication', 'invocation', 'dua'],
  zikir: ['remembrance', 'dhikr'],
  dzikir: ['remembrance', 'dhikr'],
  quran: ['quran', 'recit'],
  tafsir: ['tafsir', 'interpret'],
  medis: ['medicine'],
  obat: ['medicine'],
  sakit: ['sick', 'patient', 'medicine'],
  berburu: ['hunt'],
  hewan: ['animal'],
};

export const expandTopic = (term: string) => [term, ...(TOPICS[term] ?? [])];

export interface HadithTextHit {
  collection: HadithCollection;
  hadith: Hadith;
}

export interface HadithBookHit {
  collection: HadithCollection;
  book: HadithBook;
}

/**
 * Hadith whose text matches (the forties, which are small enough to search
 * on the device), and books across every collection whose title does.
 */
export function searchHadith(
  texts: HadithTextHit[],
  collections: HadithCollection[],
  query: ParsedQuery,
  limit = 6,
): { texts: HadithTextHit[]; books: HadithBookHit[] } {
  const textHits = texts
    .filter(({ hadith }) =>
      query.arabic
        ? !!hadith.arabic && normalizeArabic(hadith.arabic).includes(query.arabic)
        : !!hadith.translation && matchesAll(hadith.translation, query.terms, expandTopic),
    )
    .slice(0, limit);
  const books = query.arabic
    ? []
    : collections
        .filter((c) => c.books.length > 1)
        .flatMap((collection) =>
          collection.books
            .filter((book) => matchesAll(book.name, query.terms, expandTopic))
            .map((book) => ({ collection, book })),
        )
        .slice(0, limit * 2);
  return { texts: textHits, books };
}
