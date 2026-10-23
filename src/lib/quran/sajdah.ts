/**
 * The verses of prostration, as marked in the Madinah mushaf.
 */
const SAJDAH_VERSES = new Set([
  '7:206',
  '13:15',
  '16:50',
  '17:109',
  '19:58',
  '22:18',
  '22:77',
  '25:60',
  '27:26',
  '32:15',
  '38:24',
  '41:38',
  '53:62',
  '84:21',
  '96:19',
]);

export function isSajdah(verseKey: string): boolean {
  return SAJDAH_VERSES.has(verseKey);
}
