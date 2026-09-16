/**
 * The morning nudge: one notification a day, at a time the person picks, that
 * says what today holds and where their streak stands. Mondays add last
 * week's tally; the 1st of the month adds last month's.
 *
 * It is opt-in (App Review treats habit and streak nudges as marketing, so
 * the switch lives in Settings and starts off) and, like task reminders, it
 * is scheduled on the phone for the coming week from the data known now: the
 * app re-plans it on every change, so the last plan before morning wins.
 */
import type { Settings, Task } from '@/data/types';
import { addDays, addMonths, fromIso, isoMonth, splitTime } from '@/lib/format';

import { countsByDate, streak, tasksForDay } from '@/data/store';

export const NUDGE_DAYS = 7;

export type Nudge = { id: string; at: Date; title: string; body: string };

export function planNudges(tasks: Task[], settings: Settings, today: string): Nudge[] {
  const out: Nudge[] = [];
  const now = Date.now();
  for (let i = 0; i < NUDGE_DAYS; i += 1) {
    const day = addDays(today, i);
    const at = fromIso(day);
    at.setHours(settings.nudgeHour, 0, 0, 0);
    if (at.getTime() <= now) continue;
    out.push({ id: `nudge-${day}`, at, ...compose(tasks, settings, day) });
  }
  return out;
}

function compose(tasks: Task[], settings: Settings, day: string): { title: string; body: string } {
  const list = tasksForDay(tasks, day);
  const open = list.filter((t) => !t.done);
  // The streak the morning will show: days already banked before `day`.
  const days = streak(tasks, addDays(day, -1));
  const weekday = fromIso(day).getDay();
  const first = open[0];
  const when = first ? splitTime(first.time, settings.hour12) : null;

  const lines: string[] = [];
  if (open.length === 0) lines.push('Nothing planned yet. Pick one thing worth doing today.');
  else if (open.length === 1 && first && when) lines.push(`One thing today: ${first.title} at ${when.time} ${when.suffix}`.trim() + '.');
  else if (first && when) lines.push(`${open.length} things today, starting with ${first.title} at ${when.time} ${when.suffix}`.trim() + '.');

  if (days >= 2) lines.push(`Day ${days + 1} of your streak. Keep it going.`);
  else if (days === 1) lines.push('Yesterday was a clean sweep. Make it two.');

  if (weekday === 1) {
    const tally = tallyBetween(tasks, addDays(day, -7), addDays(day, -1));
    if (tally.total > 0) lines.push(`Last week: ${tally.done} of ${tally.total} done. Fresh week.`);
  }
  if (day.endsWith('-01')) {
    const last = addMonths(isoMonth(day), -1);
    const tally = tallyBetween(tasks, `${last}-01`, addDays(day, -1));
    if (tally.total > 0) lines.push(`Last month: ${tally.done} of ${tally.total} done.`);
  }

  const title = GREETINGS[dayIndex(day) % GREETINGS.length];
  return { title, body: lines.join(' ') };
}

function tallyBetween(tasks: Task[], from: string, to: string): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const [date, c] of countsByDate(tasks)) {
    if (date < from || date > to) continue;
    total += c.total;
    done += c.done;
  }
  return { done, total };
}

/** A stable number for a day, so the greeting rotates but never repeats two days running. */
function dayIndex(day: string): number {
  const d = fromIso(day);
  return Math.floor(d.getTime() / 86_400_000);
}

const GREETINGS = [
  'Good morning.',
  'Morning. Here is your day.',
  'A new day, a short list.',
  'Today, in one glance.',
  'Morning. Small steps count.',
  'Your day is ready.',
  'Good morning. Begin gently.',
];
