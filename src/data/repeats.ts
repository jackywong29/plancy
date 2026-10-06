/**
 * Repeat rules: what a repeating task or bill should produce next.
 *
 * A repeating task is a `Series`: its rule, the day it started, and what each
 * new copy takes. Copies are made a week or so ahead, never before today, so
 * a series that went quiet for a month doesn't flood the past with unticked
 * copies. Each copy's id is `copyId(series, date)`, worked out rather than
 * random, so:
 * - deleting a copy leaves a tombstone under that id, and the next top-up
 *   sees it and leaves the day empty;
 * - a copy moved to another day keeps its own date's id, so the day it left
 *   isn't filled again;
 * - two devices that make the same copy make the same record (iCloud).
 *
 * Editing or deleting a copy asks "this task only" or "this and future
 * tasks", as Calendar does. This only touches the one copy, and the series
 * carries on as before. This and future ends the series the day before and,
 * for an edit, starts a new one from the edited copy.
 *
 * Bills work month to month, by `missingBills`.
 */
import { addDays, addMonths } from '@/lib/format';

import type { MoneyEntry, Series, Task } from './types';

/** What the task sheet can change. */
export type TaskFields = Pick<Task, 'date' | 'time' | 'title' | 'notes' | 'remind' | 'repeat'>;

/** Days since an arbitrary start; exact whatever the clocks did in between. */
function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** 31 Jan + one month is 28 Feb, not 3 Mar. */
function clampDay(month: string, day: number): string {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, '0')}`;
}

/**
 * The days `s` falls on from `from` to `to`, inclusive. Weekly keeps the
 * weekday it started on; monthly keeps the day of the month, so a series on
 * the 31st goes 31 Jan, 28 Feb, 31 Mar, 30 Apr.
 */
export function seriesDates(s: Series, from: string, to: string): string[] {
  const first = from > s.start ? from : s.start;
  const last = s.until && s.until < to ? s.until : to;
  const out: string[] = [];
  if (first > last) return out;
  if (s.repeat === 'monthly') {
    const day = Number(s.start.slice(8));
    for (let month = first.slice(0, 7); ; month = addMonths(month, 1)) {
      const date = clampDay(month, day);
      if (date > last) break;
      if (date >= first) out.push(date);
    }
    return out;
  }
  const step = s.repeat === 'daily' ? 1 : 7;
  const past = (dayNumber(first) - dayNumber(s.start)) % step;
  for (let date = addDays(first, past === 0 ? 0 : step - past); date <= last; date = addDays(date, step)) out.push(date);
  return out;
}

/** The id of `s`'s copy on `date`. The first copy is the task the series was made from, and has the series' id. */
export function copyId(s: Pick<Series, 'id' | 'start'>, date: string): string {
  return date === s.start ? s.id : `${s.id}@${date}`;
}

/** A series that starts with `task` and copies it. `task.repeat` must be set. */
export function seriesFrom(task: Task, now = Date.now()): Series {
  return {
    id: task.id,
    repeat: task.repeat as Series['repeat'],
    start: task.date,
    until: '',
    title: task.title,
    notes: task.notes,
    time: task.time,
    remind: task.remind,
    position: task.position,
    createdAt: now,
    syncedAt: now,
  };
}

/**
 * Series for repeating tasks that have none: rows from before series existed,
 * and sample data. The newest copy is the template, as it was then, and the
 * oldest copy still there is the start.
 */
export function missingSeries(tasks: Task[], series: Series[]): Series[] {
  const known = new Set(series.map((s) => s.id));
  const found = new Map<string, { latest: Task; first: string }>();
  for (const t of tasks) {
    if (!t.repeat || known.has(t.seriesId)) continue;
    const seen = found.get(t.seriesId);
    if (!seen) {
      found.set(t.seriesId, { latest: t, first: t.date });
      continue;
    }
    if (t.date > seen.latest.date) seen.latest = t;
    if (t.date < seen.first) seen.first = t.date;
  }
  const now = Date.now();
  return [...found].map(([id, { latest, first }]) => ({ ...seriesFrom(latest, now), id, start: first }));
}

/**
 * The copies to make so every series reaches `through` (inclusive), starting
 * no earlier than `today`. A day is skipped when its copy exists (wherever it
 * has been moved to), was deleted (`gone` holds deleted task ids), or already
 * has another copy of the series on it.
 */
export function upcomingRepeats(
  tasks: Task[],
  series: Series[],
  gone: ReadonlySet<string>,
  today: string,
  through: string,
): Task[] {
  const ids = new Set(tasks.map((t) => t.id));
  const taken = new Set(tasks.map((t) => `${t.seriesId} ${t.date}`));
  const now = Date.now();
  const out: Task[] = [];
  for (const s of series) {
    for (const date of seriesDates(s, today, through)) {
      const id = copyId(s, date);
      if (ids.has(id) || gone.has(id) || taken.has(`${s.id} ${date}`)) continue;
      out.push({
        id,
        seriesId: s.id,
        date,
        time: s.time,
        title: s.title,
        notes: s.notes,
        position: s.position,
        remind: s.remind,
        repeat: s.repeat,
        done: false,
        carriedFrom: [],
        createdAt: now,
        syncedAt: now,
      });
    }
  }
  return out;
}

/**
 * "Delete this and future tasks": `s` stops the day before `from`, and its
 * copies on that day and after go, ticked or not. The record stays, ended,
 * so nothing can mistake its older copies for a series that lost its record.
 */
export function endSeries(s: Series, tasks: Task[], from: Task, now = Date.now()): { series: Series; remove: Task[] } {
  return {
    series: { ...s, until: addDays(from.date, -1), syncedAt: now },
    remove: tasks.filter((t) => t.seriesId === s.id && t.date >= from.date),
  };
}

/**
 * "Edit this and future tasks". `s` stops the day before `task`, its later
 * copies go, and `task`, edited, becomes the first copy of a new series with
 * the edited fields — or a one-off, if it no longer repeats. Changing how a
 * task repeats always goes this way: a new rule can't apply to copies already
 * behind you. Also turns a one-off into a series (`s` undefined).
 *
 * Editing from a series' very first copy gives that copy a new id
 * (`newId`): the new series is named after its first copy, and the old name
 * stays with the old, ended series, whose deleted copies' tombstones would
 * otherwise stop the new one filling those days.
 */
export function splitSeries(
  s: Series | undefined,
  tasks: Task[],
  task: Task,
  patch: Partial<TaskFields & Pick<Task, 'position'>>,
  newId: () => string,
  now = Date.now(),
): { series: Series[]; task: Task; remove: Task[] } {
  const series: Series[] = [];
  let remove: Task[] = [];
  let id = task.id;
  if (s) {
    const ended = endSeries(s, tasks, task, now);
    series.push(ended.series);
    remove = ended.remove.filter((t) => t.id !== task.id);
    if (task.id === s.id) {
      id = newId();
      remove.push(task);
    }
  }
  const edited: Task = { ...task, ...patch, id, seriesId: id, syncedAt: now };
  if (edited.repeat) series.push(seriesFrom(edited, now));
  return { series, task: edited, remove };
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
