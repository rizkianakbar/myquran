import { describe, expect, it } from 'vitest';
import { pageRange, verseAt } from '#/lib/quran/verse-set.ts';
import { addDays, createPlan, daysBetween, mergePlans, summarizePlan, withToday, withVerseRead } from './plans.lib.ts';
import type { ReadingPlan } from './plans.types.ts';

const START = '2026-10-01';

/**
 * Read every verse on mushaf pages `from`..`to`.
 */
function readPages(plan: ReadingPlan, from: number, to: number): ReadingPlan {
  let next = plan;
  for (let page = from; page <= to; page++) {
    const { start, end } = pageRange(page);
    for (let i = start; i < end; i++) {
      const { surah, verse } = verseAt(i);
      next = withVerseRead(next, surah, verse);
    }
  }
  return next;
}

describe('dates', () => {
  it('counts and adds whole days across month ends', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('portions', () => {
  it('gives day one of a 30-day plan exactly the first juz (pages 1–21)', () => {
    const plan = withToday(createPlan(START, addDays(START, 29)), START);
    expect(plan.today).toEqual({ date: START, fromPage: 1, toPage: 21 });
  });

  it('stays fixed for the day as the reader works through it', () => {
    let plan = withToday(createPlan(START, addDays(START, 29)), START);
    plan = readPages(plan, 1, 10);
    expect(withToday(plan, START).today).toEqual({ date: START, fromPage: 1, toPage: 21 });
    expect(summarizePlan(plan, START)).toMatchObject({
      portionRead: 10,
      portionPages: 21,
      next: { surah: 2, verse: 70 },
    });
  });

  it('spreads a missed day over the rest of the plan', () => {
    const plan = createPlan(START, addDays(START, 29));
    // Day 3 with nothing read: 604 pages over the 28 days left.
    expect(withToday(plan, addDays(START, 2)).today).toMatchObject({ fromPage: 1, toPage: 22 });
  });

  it('gives everything left once the end date has passed', () => {
    const plan = readPages(createPlan(START, addDays(START, 1)), 1, 600);
    expect(withToday(plan, addDays(START, 10)).today).toMatchObject({ fromPage: 601, toPage: 604 });
  });

  it('starts from the first unread page when the reader skipped ahead', () => {
    const plan = readPages(createPlan(START, addDays(START, 29)), 22, 40);
    expect(withToday(plan, START).today?.fromPage).toBe(1);
  });
});

describe('completion', () => {
  it('marks the plan complete when the last verse is read', () => {
    const plan = readPages(createPlan(START, addDays(START, 29)), 1, 604);
    expect(plan.completedAt).not.toBeNull();
    expect(summarizePlan(plan, START)).toMatchObject({ pagesRead: 604, portion: null, next: null });
  });
});

describe('mergePlans', () => {
  it('keeps the reading from both copies', () => {
    const base = createPlan(START, addDays(START, 29));
    const phone = readPages(base, 1, 2);
    const laptop = readPages({ ...base, endDate: addDays(START, 59) }, 3, 4);
    const merged = mergePlans(laptop, phone);
    expect(summarizePlan(merged, START).pagesRead).toBe(4);
    expect(merged.endDate).toBe(addDays(START, 59));
  });
});
