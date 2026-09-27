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

export function countsByDate(tasks: Task[]): Map<string, { total: number; done: number }> {
  const map = new Map<string, { total: number; done: number }>();
  for (const t of tasks) {
    const entry = map.get(t.date) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (t.done) entry.done += 1;
    map.set(t.date, entry);
  }
  return map;
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
