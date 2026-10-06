/**
 * Records for tests, filled with dull defaults so each test only spells out
 * what it's about.
 */
import type { MoneyEntry, Series, Settings, Task } from '@/data/types';

let next = 0;

export function task(fields: Partial<Task> = {}): Task {
  const id = fields.id ?? `t${(next += 1)}`;
  return {
    id,
    date: '2026-09-24',
    time: '09:00',
    position: 0,
    remind: true,
    title: `Task ${id}`,
    notes: '',
    repeat: '',
    seriesId: id,
    done: false,
    carriedFrom: [],
    createdAt: 0,
    syncedAt: 0,
    ...fields,
  };
}

export function series(fields: Partial<Series> = {}): Series {
  const id = fields.id ?? `s${(next += 1)}`;
  return {
    id,
    repeat: 'daily',
    start: '2026-09-24',
    until: '',
    title: `Series ${id}`,
    notes: '',
    time: '09:00',
    remind: true,
    position: 0,
    createdAt: 0,
    syncedAt: 0,
    ...fields,
  };
}

export function bill(fields: Partial<MoneyEntry> = {}): MoneyEntry {
  const id = fields.id ?? `m${(next += 1)}`;
  return {
    id,
    month: '2026-09',
    kind: 'bill',
    label: 'Rent',
    amountMinor: 180000,
    dueDay: 1,
    paid: false,
    repeatMonthly: true,
    seriesId: id,
    createdAt: 0,
    syncedAt: 0,
    ...fields,
  };
}

export function settings(fields: Partial<Settings> = {}): Settings {
  return {
    appearance: 'system',
    accent: '#6D5EF0',
    currency: 'MYR',
    weekStart: 1,
    hour12: true,
    remind: true,
    leadMinutes: 10,
    haptics: true,
    lockEnabled: false,
    lockScope: 'private',
    nudge: false,
    nudgeHour: 8,
    nudgeVoice: 'warm',
    evening: false,
    eveningHour: 20,
    // Off here (it's on in the app) so a test with tasks on past days sees
    // them stay put; the carry-over tests turn it on.
    carryOver: false,
    carrySince: '',
    widgetStyle: 'progress',
    calendar: 'week',
    onboarded: true,
    ...fields,
  };
}

/** Every day from `from` to `to`, inclusive. */
export function days(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T12:00:00`);
  for (;;) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (iso > to) return out;
    out.push(iso);
    d.setDate(d.getDate() + 1);
  }
}

/** A run of finished days ending on `last`, one task each. */
export function finishedDays(count: number, last: string): Task[] {
  const d = new Date(`${last}T12:00:00`);
  d.setDate(d.getDate() - count + 1);
  const first = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return days(first, last).map((date) => task({ date, done: true }));
}
