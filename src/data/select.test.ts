import { bill, finishedDays, task } from '../../test/make';
import { countsByDate, monthTotals, streak, streakFrom, tasksForDay, withTicked } from './select';

describe('streak', () => {
  it('counts finished days in a row, ending today', () => {
    expect(streak(finishedDays(3, '2026-09-24'), '2026-09-24')).toBe(3);
  });

  it('does not lose a live streak just because today is not finished yet', () => {
    const tasks = [...finishedDays(2, '2026-09-23'), task({ date: '2026-09-24', done: false })];
    expect(streak(tasks, '2026-09-24')).toBe(2);
  });

  it('does not lose it on a day with nothing planned yet either', () => {
    expect(streak(finishedDays(2, '2026-09-23'), '2026-09-24')).toBe(2);
  });

  it('stops at a day that had nothing planned', () => {
    const tasks = [...finishedDays(3, '2026-09-20'), ...finishedDays(2, '2026-09-24')];
    expect(streak(tasks, '2026-09-24')).toBe(2);
  });

  it('stops at a day that was left unfinished', () => {
    const tasks = [...finishedDays(3, '2026-09-24'), task({ date: '2026-09-23', done: false })];
    expect(streak(tasks, '2026-09-24')).toBe(1);
  });

  it('runs straight through daylight saving and the new year', () => {
    expect(streak(finishedDays(10, '2026-10-08'), '2026-10-08')).toBe(10);
    expect(streak(finishedDays(10, '2027-01-03'), '2027-01-03')).toBe(10);
  });

  it('is 0 with no tasks at all', () => {
    expect(streak([], '2026-09-24')).toBe(0);
  });
});

describe('countsByDate and tasksForDay', () => {
  it('counts each day’s tasks and finished ones', () => {
    const tasks = [task({ date: 'a', done: true }), task({ date: 'a' }), task({ date: 'b', done: true })];
    expect(countsByDate(tasks)).toEqual(
      new Map([
        ['a', { total: 2, done: 1 }],
        ['b', { total: 1, done: 1 }],
      ]),
    );
  });

  it('gives one day’s tasks in the day’s order', () => {
    const tasks = [
      task({ date: '2026-09-24', time: '', title: 'anytime' }),
      task({ date: '2026-09-25', time: '06:00', title: 'tomorrow' }),
      task({ date: '2026-09-24', time: '08:00', title: 'eight' }),
    ];
    expect(tasksForDay(tasks, '2026-09-24').map((t) => t.title)).toEqual(['eight', 'anytime']);
  });
});

describe('monthTotals', () => {
  it('adds up each kind, and what is left', () => {
    const entries = [
      bill({ kind: 'income', amountMinor: 500000 }),
      bill({ kind: 'saving', amountMinor: 50000 }),
      bill({ kind: 'spending', amountMinor: 12345 }),
      bill({ kind: 'spending', amountMinor: 655 }),
      bill({ kind: 'bill', amountMinor: 180000 }),
    ];
    expect(monthTotals(entries)).toEqual({
      income: 500000,
      saving: 50000,
      spending: 13000,
      bills: 180000,
      spent: 193000,
      left: 257000,
    });
  });

  it('can go below zero', () => {
    expect(monthTotals([bill({ kind: 'bill', amountMinor: 100 })]).left).toBe(-100);
  });
});

describe('streakFrom and withTicked', () => {
  it('match working it out from the ticked list', () => {
    const today = '2026-09-24';
    const tasks = [
      task({ id: 'y', date: '2026-09-23', done: true }),
      task({ id: 'a', date: today, done: true }),
      task({ id: 'b', date: today }),
    ];
    const counts = countsByDate(tasks);
    expect(streakFrom(counts, today)).toBe(streak(tasks, today));
    const after = tasks.map((t) => (t.id === 'b' ? { ...t, done: true } : t));
    const ticked = withTicked(counts, today);
    expect(ticked).toEqual(countsByDate(after));
    expect(streakFrom(ticked, today)).toBe(2);
    // The original counts are left alone.
    expect(counts.get(today)).toEqual({ total: 2, done: 1 });
  });
});
