import { describe, expect, it } from 'vitest';
import {
  compassPoint,
  kaabaDistanceKm,
  methodFor,
  PRAYERS,
  prayerDay,
  qiblaBearing,
  reminderDue,
  turnBetween,
} from './prayer.lib.ts';
import type { Place, PrayerSettings } from './prayer.types.ts';

const JAKARTA: Place = { name: 'Jakarta', lat: -6.2, lng: 106.85, timezone: 'Asia/Jakarta', country: 'ID' };
const LONDON: Place = { name: 'London', lat: 51.51, lng: -0.13, timezone: 'Europe/London', country: 'GB' };
const AUTO: PrayerSettings = { place: null, method: 'auto', madhab: 'shafi', reminders: true };

function hhmm(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(date);
}

describe('methodFor', () => {
  it("uses the place's country unless the reader chose a method", () => {
    expect(methodFor(AUTO, JAKARTA)).toBe('kemenag');
    expect(methodFor(AUTO, { ...JAKARTA, country: 'FR' })).toBe('mwl');
    expect(methodFor({ ...AUTO, method: 'isna' }, JAKARTA)).toBe('isna');
  });
});

describe('prayerDay', () => {
  // 10:00 in Jakarta (UTC+7) on 23 October 2026.
  const morning = new Date('2026-10-23T03:00:00Z');

  it('gives the six times in order, on the right day in the place’s zone', () => {
    const { times } = prayerDay(JAKARTA, AUTO, morning);
    const instants = PRAYERS.map((p) => times[p].getTime());
    expect(instants).toEqual([...instants].sort((a, b) => a - b));
    // Jakarta is near the equator: Fajr around 04:00, Maghrib around 18:00 all year.
    expect(hhmm(times.fajr, JAKARTA.timezone)).toMatch(/^04:/);
    expect(hhmm(times.maghrib, JAKARTA.timezone)).toMatch(/^1[78]:/);
  });

  it('names Dhuhr as next mid-morning, with no prayer current after sunrise', () => {
    const day = prayerDay(JAKARTA, AUTO, morning);
    expect(day.next.name).toBe('dhuhr');
    expect(day.current).toBeNull();
  });

  it("rolls over to tomorrow's Fajr after Isha", () => {
    // 23:00 in Jakarta.
    const night = new Date('2026-10-23T16:00:00Z');
    const day = prayerDay(JAKARTA, AUTO, night);
    expect(day.current).toBe('isha');
    expect(day.next.name).toBe('fajr');
    expect(day.next.at.getTime()).toBeGreaterThan(night.getTime());
  });

  it('works out the day in the place’s zone, not the device’s', () => {
    // Already the 24th in Jakarta, still the 23rd in London.
    const instant = new Date('2026-10-23T22:00:00Z');
    const jakartaFajr = prayerDay(JAKARTA, AUTO, instant).times.fajr;
    expect(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(jakartaFajr)).toBe('2026-10-24');
  });

  it('puts Hanafi Asr later than the standard one', () => {
    const standard = prayerDay(LONDON, AUTO, morning).times.asr;
    const hanafi = prayerDay(LONDON, { ...AUTO, madhab: 'hanafi' }, morning).times.asr;
    expect(hanafi.getTime()).toBeGreaterThan(standard.getTime());
  });
});

describe('qibla', () => {
  it('matches well-known bearings', () => {
    expect(qiblaBearing(JAKARTA)).toBeCloseTo(295, 0);
    expect(qiblaBearing({ lat: 40.71, lng: -74.01 })).toBeCloseTo(58.5, 0);
    expect(qiblaBearing(LONDON)).toBeCloseTo(119, 0);
  });

  it('measures the distance to the Kaaba', () => {
    expect(kaabaDistanceKm(JAKARTA)).toBeGreaterThan(7800);
    expect(kaabaDistanceKm(JAKARTA)).toBeLessThan(8000);
  });

  it('names compass points and turns the short way', () => {
    expect(compassPoint(295)).toBe('NW');
    expect(compassPoint(359)).toBe('N');
    expect(turnBetween(350, 10)).toBe(20);
    expect(turnBetween(10, 350)).toBe(-20);
  });
});

describe('reminderDue', () => {
  const none: { answered: string[]; snooze: null } = { answered: [], snooze: null };
  /** Answer whatever is asked at `at`, as the reader tapping "Sudah". */
  const answer = (state: { answered: string[]; snooze: null }, at: Date) => {
    const due = reminderDue(prayerDay(JAKARTA, AUTO, at), at, state);
    return due ? { ...state, answered: [...state.answered, due.id] } : state;
  };
  const askedAt = (state: { answered: string[]; snooze: null }, at: Date) =>
    reminderDue(prayerDay(JAKARTA, AUTO, at), at, state)?.prayer ?? null;
  // Ten minutes into each of 23 October's prayers in Jakarta.
  const day = prayerDay(JAKARTA, AUTO, new Date('2026-10-23T03:00:00Z'));
  const into = (name: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha') =>
    new Date(day.times[name].getTime() + 10 * 60_000);

  it('asks once at every adhan, five times a day, even after each is answered', () => {
    let state = none;
    const asked: (string | null)[] = [];
    for (const name of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
      asked.push(askedAt(state, into(name)));
      state = answer(state, into(name));
      // Answered: not asked again within the same prayer's time.
      expect(askedAt(state, new Date(into(name).getTime() + 5 * 60_000))).toBeNull();
    }
    expect(asked).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
  });

  it('counts each prayer’s time to the next adhan, Fajr’s to sunrise', () => {
    const isha = reminderDue(prayerDay(JAKARTA, AUTO, into('isha')), into('isha'), none);
    expect(isha?.endsAt).toEqual(prayerDay(JAKARTA, AUTO, into('isha')).next.at);
    const fajr = reminderDue(prayerDay(JAKARTA, AUTO, into('fajr')), into('fajr'), none);
    expect(fajr?.endsAt).toEqual(day.times.sunrise);
    // Between sunrise and Dhuhr no prayer's time is running.
    expect(askedAt(none, new Date('2026-10-23T03:00:00Z'))).toBeNull();
  });

  it('treats last night’s Isha as one prayer either side of midnight', () => {
    const lateNight = new Date('2026-10-23T18:30:00Z'); // 01:30 on the 24th in Jakarta
    expect(askedAt(none, lateNight)).toBe('isha');
    // Answered at 20:10 the night before: not asked again after midnight.
    const answered = answer(none, into('isha'));
    expect(askedAt(answered, lateNight)).toBeNull();
    // The next night's Isha is a new prayer, asked about afresh.
    const nextNight = new Date(into('isha').getTime() + 24 * 3_600_000);
    expect(askedAt(answered, nextNight)).toBe('isha');
  });

  it('waits out a snooze, then asks again within the same prayer', () => {
    const at = into('asr');
    const due = reminderDue(prayerDay(JAKARTA, AUTO, at), at, none);
    const snoozed = { answered: [], snooze: { id: due?.id ?? '', until: at.getTime() + 20 * 60_000 } };
    expect(reminderDue(prayerDay(JAKARTA, AUTO, at), at, snoozed)).toBeNull();
    const later = new Date(at.getTime() + 21 * 60_000);
    expect(reminderDue(prayerDay(JAKARTA, AUTO, later), later, snoozed)?.prayer).toBe('asr');
  });
});
