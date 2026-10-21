/**
 * Recitation audio and word-level timings come from quran.com's QDC API at
 * runtime — they belong to the audio files, so they aren't part of the
 * static data pack.
 */
const QDC_API = 'https://api.qurancdn.com/api/qdc';

export const reciters: { id: number; name: string }[] = [
  { id: 7, name: 'Mishari Rashid al-Afasy' },
  { id: 6, name: 'Mahmoud Khalil al-Husary' },
  { id: 2, name: 'AbdulBaset AbdulSamad' },
  { id: 9, name: 'Mohamed Siddiq al-Minshawi' },
  { id: 4, name: 'Abu Bakr al-Shatri' },
  { id: 3, name: 'Abdur-Rahman as-Sudais' },
];

/**
 * A verse's span within the surah file, plus per-word `[position, fromMs, toMs]`.
 */
export interface VerseTiming {
  verse: number;
  from: number;
  to: number;
  words: [number, number, number][];
}

export interface SurahAudio {
  url: string;
  verses: VerseTiming[];
}

interface ApiAudioFile {
  audio_url: string;
  verse_timings: {
    verse_key: string;
    timestamp_from: number;
    timestamp_to: number;
    segments: number[][];
  }[];
}

const cache = new Map<string, Promise<SurahAudio>>();

export function getSurahAudio(reciter: number, surah: number): Promise<SurahAudio> {
  const key = `${reciter}:${surah}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = fetch(`${QDC_API}/audio/reciters/${reciter}/audio_files?chapter=${surah}&segments=true`)
      .then((res) => {
        if (!res.ok) throw new Error(`Audio lookup failed: ${res.status}`);
        return res.json() as Promise<{ audio_files: ApiAudioFile[] }>;
      })
      .then(({ audio_files }) => {
        const file = audio_files[0];
        if (!file) throw new Error('No audio for this reciter');
        return {
          url: file.audio_url,
          verses: file.verse_timings.map((t) => ({
            verse: Number(t.verse_key.split(':')[1]),
            from: t.timestamp_from,
            to: t.timestamp_to,
            // Upstream data has stray one-element segments; drop anything malformed.
            words: (t.segments ?? []).filter((s): s is [number, number, number] => s.length === 3),
          })),
        };
      });
    hit.catch(() => cache.delete(key));
    cache.set(key, hit);
  }
  return hit;
}

/**
 * quran.com's single-word recordings, used for the word popover's play button.
 */
export function wordAudioUrl(surah: number, verse: number, word: number): string {
  const pad = (n: number) => String(n).padStart(3, '0');
  return `https://audio.qurancdn.com/wbw/${pad(surah)}_${pad(verse)}_${pad(word)}.mp3`;
}
