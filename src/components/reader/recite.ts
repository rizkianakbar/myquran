/**
 * Where a word stands relative to the recitation, for the karaoke styles in
 * main.css (`[data-recite]` inside `.reciting`).
 */
export type ReciteState = 'recited' | 'current' | 'upcoming';

export function reciteState(position: number, currentWord: number | null): ReciteState {
  if (currentWord === null || position > currentWord) return 'upcoming';
  return position === currentWord ? 'current' : 'recited';
}
