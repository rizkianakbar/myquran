export interface PracticeRange {
  surah: number;
  from: number;
  to: number;
}

/**
 * A memorized passage and when it next needs reviewing. Reviews space out
 * as it sticks (see `REVIEW_INTERVALS`); a weak review starts it over.
 */
export interface Passage extends PracticeRange {
  /**
   * `YYYY-MM-DD` it was memorized.
   */
  learned: string;
  /**
   * Solid reviews in a row; picks the next interval.
   */
  streak: number;
  /**
   * `YYYY-MM-DD` it is next due for review.
   */
  due: string;
}

export interface MemorizeSettings {
  /**
   * Times each verse plays in the Listen step.
   */
  listenRepeats: number;
  /**
   * Show each hidden verse's first word as a prompt.
   */
  firstWordHint: boolean;
  showMeaning: boolean;
  /**
   * What to build from the word bank for each verse: its Arabic, its
   * meaning, or both (Arabic first).
   */
  practise: Practise;
}

export type Practise = 'arabic' | 'meaning' | 'both';

/**
 * The passage being learned, and which of its verses are learned so far,
 * so a session can stop and be picked up later.
 */
export interface Learning {
  range: PracticeRange;
  learned: number[];
}

/**
 * Where a session is: listening to one verse, or building it (its Arabic
 * or its meaning) from a word bank; reciting the whole passage (`connect`,
 * also what a review is); or finished.
 */
export type Step =
  | { kind: 'listen'; verse: number }
  | { kind: 'build'; verse: number; part: 'arabic' | 'meaning' }
  | { kind: 'connect' }
  | { kind: 'done' };
