/**
 * Carry-over: a one-off task left unfinished moves on to the next day.
 *
 * It lands at the top of that day's Anytime list. A timed task loses its
 * time, because the time has passed and a reminder at the same hour tomorrow
 * would be a guess. Repeating tasks stay put: the next day has its own copy.
 *
 * Moving a task doesn't rewrite history. Every day it sat unfinished goes
 * into `carriedFrom`, and `countsByDate` (data/select.ts) still counts it as
 * an open task on each of those days, so a streak only survives a day that
 * was actually finished.
 *
 * iOS doesn't wake an app at midnight, so the store runs this when plancy
 * opens, comes to the front, or is open as the day turns. Plans made ahead of
 * time (the nudges, the widget's later days) use `asOf` to see the day as it
 * will look once that has happened.
 */
import { addDays } from '@/lib/format';

import { dayOrder, isAnytime } from './order';
import type { Settings, Task } from './types';

/**
 * The tasks that move to `today`, already moved: unfinished, not repeating,
 * dated before today and not before `since` (empty means no limit). Empty
 * when nothing moves.
 */
export function carryOver(tasks: Task[], today: string, since: string): Task[] {
  const moving = tasks.filter((t) => !t.done && t.repeat === '' && t.date < today && (!since || t.date >= since));
  if (moving.length === 0) return [];

  // Oldest day first, each day in its own order, all above what's already there.
  const ordered = [...new Set(moving.map((t) => t.date))].sort().flatMap((date) => dayOrder(moving.filter((t) => t.date === date)));
  const already = tasks.filter((t) => t.date === today && isAnytime(t)).map((t) => t.position);
  const top = already.length > 0 ? Math.min(...already) : 0;
  const now = Date.now();

  return ordered.map((t, i) => {
    const missed: string[] = [];
    for (let d = t.date; d < today; d = addDays(d, 1)) missed.push(d);
    return {
      ...t,
      date: today,
      time: '',
      position: top - ordered.length + i,
      carriedFrom: [...t.carriedFrom, ...missed],
      syncedAt: now,
    };
  });
}

/** `tasks` with carry-over applied as of the morning of `day`, if it's on. */
export function asOf(tasks: Task[], day: string, settings: Pick<Settings, 'carryOver' | 'carrySince'>): Task[] {
  if (!settings.carryOver) return tasks;
  const moved = carryOver(tasks, day, settings.carrySince);
  if (moved.length === 0) return tasks;
  const byId = new Map(moved.map((t) => [t.id, t]));
  return tasks.map((t) => byId.get(t.id) ?? t);
}
