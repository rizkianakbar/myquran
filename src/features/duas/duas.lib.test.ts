import { describe, expect, it } from 'vitest';
import { categoryForHour, repeatCount } from './duas.lib.ts';

describe('repeatCount', () => {
  it('reads how many times a dua is said, in English or Indonesian', () => {
    expect(repeatCount('Recite 3x')).toBe(3);
    expect(repeatCount('Dibaca 3 kali')).toBe(3);
    expect(repeatCount('100 times')).toBe(100);
    expect(repeatCount('Dibaca 1x')).toBeNull();
    expect(repeatCount('Read in the morning')).toBeNull();
    expect(repeatCount(null)).toBeNull();
  });
});

describe('categoryForHour', () => {
  it('opens on the dhikr for the time of day', () => {
    expect(categoryForHour(5)).toBe('morning-dhikr');
    expect(categoryForHour(11)).toBe('morning-dhikr');
    expect(categoryForHour(13)).toBe('daily-dua');
    expect(categoryForHour(16)).toBe('evening-dhikr');
    expect(categoryForHour(23)).toBe('daily-dua');
  });
});
