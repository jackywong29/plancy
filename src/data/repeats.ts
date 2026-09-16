/**
 * Repeat rules: what a repeating task or bill should produce next.
 *
 * Each repeating task is a series (`seriesId`). The newest instance in a
 * series is the template; the next one is created a step later, and never
 * earlier than today, so a series that went quiet for a month does not flood
 * the past with unticked copies. Bills work the same way month to month.
 */
import { addDays, addMonths } from '@/lib/format';

import type { MoneyEntry, Task } from './types';

function step(task: Task, from: string): string {
  if (task.repeat === 'daily') return addDays(from, 1);
  if (task.repeat === 'weekly') return addDays(from, 7);
  const day = from.slice(8);
  const month = addMonths(from.slice(0, 7), 1);
  return clampDay(month, Number(day));
}

/** 31 Jan + one month is 28 Feb, not 3 Mar. */
function clampDay(month: string, day: number): string {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, '0')}`;
}

/**
 * Tasks to create so every series reaches `through` (inclusive). The caller
 * assigns ids and saves them.
 */
export function upcomingRepeats(tasks: Task[], today: string, through: string): Omit<Task, 'id'>[] {
  const bySeries = new Map<string, Task>();
  for (const t of tasks) {
    if (!t.repeat) continue;
    const key = t.seriesId || t.id;
    const latest = bySeries.get(key);
    if (!latest || t.date > latest.date) bySeries.set(key, t);
  }

  const out: Omit<Task, 'id'>[] = [];
  const now = Date.now();
  for (const [seriesId, latest] of bySeries) {
    let date = step(latest, latest.date);
    // Skip straight to today if the series fell behind.
    while (date < today) date = step(latest, date);
    while (date <= through) {
      out.push({
        seriesId,
        date,
        time: latest.time,
        title: latest.title,
        repeat: latest.repeat,
        done: false,
        createdAt: now,
        syncedAt: now,
      });
      date = step(latest, date);
    }
  }
  return out;
}

/** Bills marked "repeat monthly" that have no copy in `month` yet. */
export function missingBills(money: MoneyEntry[], month: string): Omit<MoneyEntry, 'id'>[] {
  const series = new Map<string, MoneyEntry>();
  for (const m of money) {
    if (m.kind !== 'bill' || !m.repeatMonthly || m.month >= month) continue;
    const key = m.seriesId || m.id;
    const latest = series.get(key);
    if (!latest || m.month > latest.month) series.set(key, m);
  }
  const present = new Set(money.filter((m) => m.month === month).map((m) => m.seriesId || m.id));
  const now = Date.now();
  const out: Omit<MoneyEntry, 'id'>[] = [];
  for (const [seriesId, latest] of series) {
    if (present.has(seriesId)) continue;
    out.push({
      seriesId,
      month,
      kind: 'bill',
      label: latest.label,
      amountMinor: latest.amountMinor,
      dueDay: latest.dueDay,
      paid: false,
      repeatMonthly: true,
      createdAt: now,
      syncedAt: now,
    });
  }
  return out;
}
