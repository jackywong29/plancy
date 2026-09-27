import { addDays } from '@/lib/format';

import { bill, days, task } from '../../test/make';
import { missingBills, upcomingRepeats } from './repeats';
import type { Task } from './types';

let made = 0;

/**
 * What the store does on each day it runs: fill every series through a week
 * from today, giving the new copies ids. Returns the grown list.
 */
function topUp(tasks: Task[], today: string): Task[] {
  const created = upcomingRepeats(tasks, today, addDays(today, 7)).map((t) => ({ id: `made${(made += 1)}`, ...t }));
  return [...tasks, ...created];
}

/** plancy opened every day from `from` to `to`. */
function liveThrough(tasks: Task[], from: string, to: string): Task[] {
  let list = tasks;
  for (const day of days(from, to)) list = topUp(list, day);
  return list;
}

const dates = (tasks: { date: string }[]) => tasks.map((t) => t.date).sort();

describe('monthly repeats keep their day of the month', () => {
  it('31 Jan steps to 28 Feb, then back to 31 Mar, 30 Apr, 31 May (KNOWN-1)', () => {
    const first = task({ date: '2026-01-31', repeat: 'monthly' });
    expect(dates(upcomingRepeats([first], '2026-01-31', '2026-05-31'))).toEqual([
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
  });

  it('... and still does when made a week at a time, the way the app makes them (KNOWN-1)', () => {
    const first = task({ date: '2026-01-31', repeat: 'monthly' });
    expect(dates(liveThrough([first], '2026-01-31', '2026-06-01'))).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
  });

  it('30 Jan steps to 28 Feb, then 30 Mar', () => {
    const first = task({ date: '2026-01-30', repeat: 'monthly' });
    expect(dates(upcomingRepeats([first], '2026-01-30', '2026-03-31'))).toEqual(['2026-02-28', '2026-03-30']);
  });

  it('29 Feb in a leap year steps to 28 Feb the next year, then back to the 29th', () => {
    const first = task({ date: '2028-02-29', repeat: 'monthly' });
    const out = dates(upcomingRepeats([first], '2028-02-29', '2029-03-31'));
    expect(out).toContain('2029-02-28');
    expect(out).toContain('2029-03-29');
    expect(out.every((d) => d.endsWith('-29') || d === '2029-02-28')).toBe(true);
  });

  it('the 15th stays the 15th for twelve months', () => {
    const first = task({ date: '2026-01-15', repeat: 'monthly' });
    const out = dates(upcomingRepeats([first], '2026-01-15', '2027-01-15'));
    expect(out).toHaveLength(12);
    expect(out.every((d) => d.endsWith('-15'))).toBe(true);
  });
});

describe('daily and weekly repeats', () => {
  it('daily fills every day from today through the last day, once each', () => {
    const first = task({ date: '2026-09-24', repeat: 'daily' });
    const all = [first, ...upcomingRepeats([first], '2026-09-24', '2026-10-01')];
    expect(dates(all)).toEqual(days('2026-09-24', '2026-10-01'));
  });

  it('weekly lands on the same weekday every time, across daylight saving', () => {
    const first = task({ date: '2026-09-24', repeat: 'weekly' }); // a Thursday
    const out = upcomingRepeats([first], '2026-09-24', '2026-12-31');
    expect(out).toHaveLength(14);
    for (const t of out) expect(new Date(`${t.date}T12:00:00`).getDay()).toBe(4);
  });

  it('a series left alone for a month starts again today, not in the past', () => {
    const old = task({ date: '2026-08-01', repeat: 'daily' });
    const out = dates(upcomingRepeats([old], '2026-09-24', '2026-09-26'));
    expect(out).toEqual(['2026-09-24', '2026-09-25', '2026-09-26']);
  });

  it('a weekly series left alone keeps its weekday when it starts again', () => {
    const old = task({ date: '2026-08-03', repeat: 'weekly' }); // a Monday
    expect(dates(upcomingRepeats([old], '2026-09-24', '2026-10-06'))).toEqual(['2026-09-28', '2026-10-05']);
  });

  it('topping up twice on the same day adds nothing the second time', () => {
    const first = task({ date: '2026-09-24', repeat: 'daily' });
    const once = topUp([first], '2026-09-24');
    expect(topUp(once, '2026-09-24')).toHaveLength(once.length);
  });
});

describe('series', () => {
  it('copies the newest instance, so an edit to it carries forward', () => {
    const older = task({ id: 'a', seriesId: 'a', date: '2026-09-23', repeat: 'daily', title: 'Run', time: '07:00' });
    const newest = task({ id: 'b', seriesId: 'a', date: '2026-09-24', repeat: 'daily', title: 'Run 5k', time: '06:30', notes: 'Park loop' });
    const [next] = upcomingRepeats([older, newest], '2026-09-24', '2026-09-25');
    expect(next).toMatchObject({ seriesId: 'a', date: '2026-09-25', title: 'Run 5k', time: '06:30', notes: 'Park loop' });
  });

  it('never copies a tick', () => {
    const done = task({ date: '2026-09-24', repeat: 'daily', done: true });
    expect(upcomingRepeats([done], '2026-09-24', '2026-09-26').every((t) => !t.done)).toBe(true);
  });

  it('carries the per-task reminder choice and the anytime position', () => {
    const quiet = task({ date: '2026-09-24', time: '', position: 3, remind: false, repeat: 'daily' });
    const [next] = upcomingRepeats([quiet], '2026-09-24', '2026-09-25');
    expect(next).toMatchObject({ time: '', position: 3, remind: false });
  });

  it('keeps two series with the same title apart', () => {
    const a = task({ id: 'a', seriesId: 'a', title: 'Gym', date: '2026-09-24', repeat: 'daily' });
    const b = task({ id: 'b', seriesId: 'b', title: 'Gym', date: '2026-09-24', repeat: 'daily' });
    const out = upcomingRepeats([a, b], '2026-09-24', '2026-09-25');
    expect(out.map((t) => t.seriesId).sort()).toEqual(['a', 'b']);
  });

  it('makes nothing from a task that does not repeat', () => {
    expect(upcomingRepeats([task({ date: '2026-09-24' })], '2026-09-24', '2026-12-31')).toEqual([]);
  });

  it('deleting a copy in the middle of the week does not bring it back', () => {
    const first = task({ date: '2026-09-24', repeat: 'daily' });
    const week = topUp([first], '2026-09-24');
    const without = week.filter((t) => t.date !== '2026-09-27');
    expect(dates(topUp(without, '2026-09-24'))).not.toContain('2026-09-27');
  });
});

/*
 * Found while writing these tests (24 Sep). Each of these is written the way
 * plancy *should* behave, and marked `failing` because today it doesn't:
 * Jest passes a `failing` test only while it still fails. When a fix lands,
 * the test turns red — that is the cue to change `it.failing` to `it`.
 */
describe('known gaps in repeat series', () => {
  it.failing('BUG-1: deleting the furthest copy of a series does not bring it back', () => {
    const first = task({ date: '2026-09-24', repeat: 'daily' });
    const week = topUp([first], '2026-09-24'); // through 1 Oct
    const without = week.filter((t) => t.date !== '2026-10-01');
    // Opening plancy again the same day, or adding any task, tops the series up.
    expect(dates(topUp(without, '2026-09-24'))).not.toContain('2026-10-01');
  });

  it.failing('BUG-2: deleting the first copy of a monthly series on the 31st keeps it on the 31st', () => {
    const first = task({ id: 'jan', seriesId: 'jan', date: '2026-01-31', repeat: 'monthly' });
    const withFeb = liveThrough([first], '2026-01-31', '2026-02-21'); // Feb's copy now exists
    const janGone = withFeb.filter((t) => t.id !== 'jan');
    const march = liveThrough(janGone, '2026-02-22', '2026-03-24').filter((t) => t.date.startsWith('2026-03'));
    expect(dates(march)).toEqual(['2026-03-31']);
  });
});

describe('monthly bills', () => {
  it('copies a repeating bill into a month that lacks it, unpaid', () => {
    const rent = bill({ month: '2026-09', paid: true });
    const [copy] = missingBills([rent], '2026-10');
    expect(copy).toMatchObject({ month: '2026-10', seriesId: rent.id, paid: false, repeatMonthly: true, kind: 'bill' });
  });

  it('does not copy a bill that is already there', () => {
    const rent = bill({ id: 'r', seriesId: 'r', month: '2026-09' });
    const october = bill({ id: 'r2', seriesId: 'r', month: '2026-10' });
    expect(missingBills([rent, october], '2026-10')).toEqual([]);
  });

  it('carries the amount, due day and label forward from the latest month', () => {
    const aug = bill({ id: 'r', seriesId: 'r', month: '2026-08', amountMinor: 170000, dueDay: 1 });
    const sep = bill({ id: 'r2', seriesId: 'r', month: '2026-09', amountMinor: 180000, dueDay: 3, label: 'Rent (new lease)' });
    const [copy] = missingBills([aug, sep], '2026-10');
    expect(copy).toMatchObject({ amountMinor: 180000, dueDay: 3, label: 'Rent (new lease)' });
  });

  it('does not roll a bill backwards into a month before it started', () => {
    const later = bill({ month: '2026-10' });
    expect(missingBills([later], '2026-09')).toEqual([]);
  });

  it('skips bills that do not repeat, and money that is not a bill', () => {
    const once = bill({ month: '2026-09', repeatMonthly: false });
    const pay = bill({ month: '2026-09', kind: 'income', label: 'Salary', dueDay: null });
    expect(missingBills([once, pay], '2026-10')).toEqual([]);
  });

  it('fills a month that was skipped', () => {
    const rent = bill({ month: '2026-07' });
    expect(missingBills([rent], '2026-09')).toHaveLength(1);
  });
});
