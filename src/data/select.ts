/**
 * Selectors: plain questions asked of the store's rows.
 *
 * Kept apart from store.tsx, which opens SQLite the moment it's imported, so
 * anything that only needs to read rows (celebrations, the nudge, the widget
 * feed, the tests) can use these without a database.
 */
import { addDays } from '@/lib/format';

import { dayOrder } from './order';
import type { MoneyEntry, Task } from './types';

export function tasksForDay(tasks: Task[], date: string): Task[] {
  return dayOrder(tasks.filter((t) => t.date === date));
}

/**
 * Tasks planned and finished, per day. A task carried over from a day still
 * counts there, unfinished (see data/carry.ts).
 */
export function countsByDate(tasks: Task[]): Map<string, { total: number; done: number }> {
  const map = new Map<string, { total: number; done: number }>();
  const entry = (date: string) => {
    let e = map.get(date);
    if (!e) map.set(date, (e = { total: 0, done: 0 }));
    return e;
  };
  for (const t of tasks) {
    const e = entry(t.date);
    e.total += 1;
    if (t.done) e.done += 1;
    for (const date of t.carriedFrom) entry(date).total += 1;
  }
  return map;
}

/** Tasks that sat unfinished on `date` and were carried on to a later day. */
export function movedOn(tasks: Task[], date: string): Task[] {
  return tasks.filter((t) => t.carriedFrom.includes(date));
}

/** Days in a row, ending today, where everything planned was done. */
export function streak(tasks: Task[], today: string): number {
  const counts = countsByDate(tasks);
  let day = today;
  let days = 0;
  // Today only counts once it is actually finished; an unfinished today must
  // not wipe out a streak that is still alive.
  const todayCount = counts.get(today);
  if (!todayCount || todayCount.done < todayCount.total) day = addDays(today, -1);
  for (;;) {
    const count = counts.get(day);
    if (!count || count.total === 0 || count.done < count.total) break;
    days += 1;
    day = addDays(day, -1);
  }
  return days;
}

export function moneyForMonth(money: MoneyEntry[], month: string): MoneyEntry[] {
  return money.filter((m) => m.month === month);
}

export function monthTotals(entries: MoneyEntry[]) {
  const sum = (kind: MoneyEntry['kind']) =>
    entries.filter((e) => e.kind === kind).reduce((acc, e) => acc + e.amountMinor, 0);
  const income = sum('income');
  const saving = sum('saving');
  const spending = sum('spending');
  const bills = sum('bill');
  return { income, saving, spending, bills, spent: spending + bills, left: income - saving - spending - bills };
}
