import { addDays } from '@/lib/format';

import { bill, days, series, task } from '../../test/make';
import { copyId, endSeries, missingBills, missingSeries, seriesFrom, splitSeries, upcomingRepeats } from './repeats';
import type { Series, Task } from './types';

/**
 * A little model of the store: tasks, their series, and the ids deleted so
 * far. `topUp` is what it does on each day it runs: fill every series through
 * a week from today.
 */
type World = { tasks: Task[]; series: Series[]; gone: Set<string> };

function world(first: Task): World {
  return { tasks: [first], series: [seriesFrom(first)], gone: new Set() };
}

function topUp(w: World, today: string): World {
  return { ...w, tasks: [...w.tasks, ...upcomingRepeats(w.tasks, w.series, w.gone, today, addDays(today, 7))] };
}

/** plancy opened every day from `from` to `to`. */
function liveThrough(w: World, from: string, to: string): World {
  let next = w;
  for (const day of days(from, to)) next = topUp(next, day);
  return next;
}

/** Delete the copy on `date`, the way the store does: gone, with a tombstone. */
function remove(w: World, date: string): World {
  const doomed = w.tasks.filter((t) => t.date === date).map((t) => t.id);
  return { ...w, tasks: w.tasks.filter((t) => !doomed.includes(t.id)), gone: new Set([...w.gone, ...doomed]) };
}

/** Copies of a lone series from `today` through `through`. */
function upcoming(first: Task, today: string, through: string): Task[] {
  return upcomingRepeats([first], [seriesFrom(first)], new Set(), today, through);
}

const dates = (tasks: { date: string }[]) => tasks.map((t) => t.date).sort();
const on = (w: World, date: string) => w.tasks.filter((t) => t.date === date);

describe('monthly repeats keep their day of the month', () => {
  it('31 Jan steps to 28 Feb, then back to 31 Mar, 30 Apr, 31 May (KNOWN-1)', () => {
    const first = task({ date: '2026-01-31', repeat: 'monthly' });
    expect(dates(upcoming(first, '2026-01-31', '2026-05-31'))).toEqual(['2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
  });

  it('... and still does when made a week at a time, the way the app makes them (KNOWN-1)', () => {
    const first = task({ date: '2026-01-31', repeat: 'monthly' });
    expect(dates(liveThrough(world(first), '2026-01-31', '2026-06-01').tasks)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
  });

  it('30 Jan steps to 28 Feb, then 30 Mar', () => {
    const first = task({ date: '2026-01-30', repeat: 'monthly' });
    expect(dates(upcoming(first, '2026-01-30', '2026-03-31'))).toEqual(['2026-02-28', '2026-03-30']);
  });

  it('29 Feb in a leap year steps to 28 Feb the next year, then back to the 29th', () => {
    const first = task({ date: '2028-02-29', repeat: 'monthly' });
    const out = dates(upcoming(first, '2028-02-29', '2029-03-31'));
    expect(out).toContain('2029-02-28');
    expect(out).toContain('2029-03-29');
    expect(out.every((d) => d.endsWith('-29') || d === '2029-02-28')).toBe(true);
  });

  it('the 15th stays the 15th for twelve months', () => {
    const first = task({ date: '2026-01-15', repeat: 'monthly' });
    const out = dates(upcoming(first, '2026-01-15', '2027-01-15'));
    expect(out).toHaveLength(12);
    expect(out.every((d) => d.endsWith('-15'))).toBe(true);
  });
});

describe('daily and weekly repeats', () => {
  it('daily fills every day from today through the last day, once each', () => {
    const first = task({ date: '2026-09-24', repeat: 'daily' });
    expect(dates([first, ...upcoming(first, '2026-09-24', '2026-10-01')])).toEqual(days('2026-09-24', '2026-10-01'));
  });

  it('weekly lands on the same weekday every time, across daylight saving', () => {
    const first = task({ date: '2026-09-24', repeat: 'weekly' }); // a Thursday
    const out = upcoming(first, '2026-09-24', '2026-12-31');
    expect(out).toHaveLength(14);
    for (const t of out) expect(new Date(`${t.date}T12:00:00`).getDay()).toBe(4);
  });

  it('a series left alone for a month starts again today, not in the past', () => {
    const old = task({ date: '2026-08-01', repeat: 'daily' });
    expect(dates(upcoming(old, '2026-09-24', '2026-09-26'))).toEqual(['2026-09-24', '2026-09-25', '2026-09-26']);
  });

  it('a weekly series left alone keeps its weekday when it starts again', () => {
    const old = task({ date: '2026-08-03', repeat: 'weekly' }); // a Monday
    expect(dates(upcoming(old, '2026-09-24', '2026-10-06'))).toEqual(['2026-09-28', '2026-10-05']);
  });

  it('topping up twice on the same day adds nothing the second time', () => {
    const once = topUp(world(task({ date: '2026-09-24', repeat: 'daily' })), '2026-09-24');
    expect(topUp(once, '2026-09-24').tasks).toHaveLength(once.tasks.length);
  });

  it('stops at the series’ last day', () => {
    const s = series({ start: '2026-09-24', until: '2026-09-26' });
    expect(dates(upcomingRepeats([], [s], new Set(), '2026-09-24', '2026-10-01'))).toEqual(['2026-09-24', '2026-09-25', '2026-09-26']);
  });
});

describe('copies', () => {
  it('take the series’ fields, never a tick', () => {
    const s = series({ id: 'a', title: 'Run 5k', time: '06:30', notes: 'Park loop', start: '2026-09-23' });
    const [next] = upcomingRepeats([], [s], new Set(), '2026-09-24', '2026-09-24');
    expect(next).toMatchObject({ seriesId: 'a', date: '2026-09-24', title: 'Run 5k', time: '06:30', notes: 'Park loop', done: false });
  });

  it('carry the per-task reminder choice and the anytime position', () => {
    const quiet = task({ date: '2026-09-24', time: '', position: 3, remind: false, repeat: 'daily' });
    const [next] = upcoming(quiet, '2026-09-24', '2026-09-25');
    expect(next).toMatchObject({ time: '', position: 3, remind: false });
  });

  it('have ids made from the series and the date, the same on any device', () => {
    const s = series({ id: 'gym', start: '2026-09-24' });
    expect(copyId(s, '2026-09-24')).toBe('gym');
    expect(copyId(s, '2026-09-25')).toBe('gym@2026-09-25');
    const [, second] = upcomingRepeats([], [s], new Set(), '2026-09-24', '2026-09-25');
    expect(second.id).toBe('gym@2026-09-25');
  });

  it('keep two series with the same title apart', () => {
    const a = task({ id: 'a', seriesId: 'a', title: 'Gym', date: '2026-09-24', repeat: 'daily' });
    const b = task({ id: 'b', seriesId: 'b', title: 'Gym', date: '2026-09-24', repeat: 'daily' });
    const out = upcomingRepeats([a, b], [seriesFrom(a), seriesFrom(b)], new Set(), '2026-09-24', '2026-09-25');
    expect(out.map((t) => t.seriesId).sort()).toEqual(['a', 'b']);
  });

  it('are not made for a task that does not repeat', () => {
    const lone = task({ date: '2026-09-24' });
    expect(missingSeries([lone], [])).toEqual([]);
  });
});

describe('deleting and moving one copy', () => {
  const first = task({ id: 'run', seriesId: 'run', date: '2026-09-24', repeat: 'daily' });

  it('deleting a copy in the middle of the week does not bring it back', () => {
    const w = remove(topUp(world(first), '2026-09-24'), '2026-09-27');
    expect(dates(topUp(w, '2026-09-24').tasks)).not.toContain('2026-09-27');
  });

  it('BUG-1: deleting the furthest copy of a series does not bring it back', () => {
    const w = remove(topUp(world(first), '2026-09-24'), '2026-10-01');
    // Opening plancy again the same day, or adding any task, tops the series up.
    expect(dates(topUp(w, '2026-09-24').tasks)).not.toContain('2026-10-01');
  });

  it('BUG-2: deleting the first copy of a monthly series on the 31st keeps it on the 31st', () => {
    const jan = task({ id: 'jan', seriesId: 'jan', date: '2026-01-31', repeat: 'monthly' });
    const withFeb = liveThrough(world(jan), '2026-01-31', '2026-02-21'); // Feb's copy now exists
    const janGone = remove(withFeb, '2026-01-31');
    const march = liveThrough(janGone, '2026-02-22', '2026-03-24').tasks.filter((t) => t.date.startsWith('2026-03'));
    expect(dates(march)).toEqual(['2026-03-31']);
  });

  it('moving a copy to another day does not fill the day it left', () => {
    const w = topUp(world(first), '2026-09-24');
    const moved = { ...w, tasks: w.tasks.map((t) => (t.date === '2026-09-26' ? { ...t, date: '2026-09-27' } : t)) };
    expect(on(topUp(moved, '2026-09-24'), '2026-09-26')).toEqual([]);
  });
});

describe('this and future tasks', () => {
  const first = task({ id: 'run', seriesId: 'run', date: '2026-09-24', repeat: 'daily', title: 'Run' });
  const week = topUp(world(first), '2026-09-24');
  const sat = on(week, '2026-09-26')[0];
  const ids = { next: 0 };
  const newId = () => `new${(ids.next += 1)}`;

  /** Apply a split or an end the way the store does. */
  function apply(w: World, change: { series: Series[]; remove: Task[]; task?: Task }): World {
    const removed = change.remove.map((t) => t.id);
    const kept = w.tasks.filter((t) => !removed.includes(t.id) && t.id !== change.task?.id);
    const series = [...w.series.filter((s) => !change.series.some((c) => c.id === s.id)), ...change.series];
    return { tasks: change.task ? [...kept, change.task] : kept, series, gone: new Set([...w.gone, ...removed]) };
  }

  it('deleting ends the series: that copy and every later one go, and none come back', () => {
    const ended = endSeries(week.series[0], week.tasks, sat);
    const w = topUp(apply(week, { series: [ended.series], remove: ended.remove }), '2026-09-24');
    expect(dates(w.tasks)).toEqual(['2026-09-24', '2026-09-25']);
    expect(dates(liveThrough(w, '2026-09-25', '2026-10-20').tasks)).toEqual(['2026-09-24', '2026-09-25']);
  });

  it('editing changes that copy and every later one, and leaves earlier ones alone', () => {
    const w = topUp(apply(week, splitSeries(week.series[0], week.tasks, sat, { title: 'Run 5k' }, newId)), '2026-09-24');
    const titles = Object.fromEntries(w.tasks.map((t) => [t.date, t.title]));
    expect(titles['2026-09-25']).toBe('Run');
    expect(titles['2026-09-26']).toBe('Run 5k');
    expect(titles['2026-10-01']).toBe('Run 5k');
    expect(dates(w.tasks)).toEqual(days('2026-09-24', '2026-10-01'));
  });

  it('a new rule starts from that copy: daily becomes weekly from Saturday', () => {
    const w = topUp(apply(week, splitSeries(week.series[0], week.tasks, sat, { repeat: 'weekly' }, newId)), '2026-09-24');
    expect(dates(liveThrough(w, '2026-09-25', '2026-10-03').tasks)).toEqual(['2026-09-24', '2026-09-25', '2026-09-26', '2026-10-03', '2026-10-10']);
  });

  it('“Repeat: never” keeps that copy as a one-off and stops the series, with no duplicate', () => {
    const w = topUp(apply(week, splitSeries(week.series[0], week.tasks, sat, { repeat: '' }, newId)), '2026-09-24');
    expect(dates(w.tasks)).toEqual(['2026-09-24', '2026-09-25', '2026-09-26']);
    expect(on(w, '2026-09-26')[0]).toMatchObject({ repeat: '', seriesId: sat.id });
  });

  it('from the very first copy, everything takes the edit, even days whose copies were deleted before', () => {
    const holes = remove(week, '2026-09-28');
    const w = topUp(apply(holes, splitSeries(holes.series[0], holes.tasks, first, { title: 'Swim' }, newId)), '2026-09-24');
    expect(w.tasks.every((t) => t.title === 'Swim')).toBe(true);
    expect(dates(w.tasks)).toEqual(days('2026-09-24', '2026-10-01'));
  });

  it('turns a one-off into a series that starts on its day', () => {
    const lone = task({ id: 'lone', date: '2026-09-24' });
    const change = splitSeries(undefined, [lone], lone, { repeat: 'weekly' }, newId);
    expect(change.series).toEqual([expect.objectContaining({ id: 'lone', start: '2026-09-24', repeat: 'weekly' })]);
    expect(change.task).toMatchObject({ id: 'lone', seriesId: 'lone', repeat: 'weekly' });
  });
});

describe('rows from before series existed', () => {
  it('get a series copied from the newest copy, starting on the oldest', () => {
    const older = task({ id: 'a', seriesId: 'a', date: '2026-09-23', repeat: 'daily', title: 'Run', time: '07:00' });
    const newest = task({ id: 'b', seriesId: 'a', date: '2026-09-24', repeat: 'daily', title: 'Run 5k', time: '06:30' });
    expect(missingSeries([older, newest], [])).toEqual([
      expect.objectContaining({ id: 'a', start: '2026-09-23', title: 'Run 5k', time: '06:30', repeat: 'daily' }),
    ]);
  });

  it('are left alone once their series exists', () => {
    const first = task({ date: '2026-09-24', repeat: 'daily' });
    expect(missingSeries([first], [seriesFrom(first)])).toEqual([]);
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
