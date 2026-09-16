/**
 * The morning nudge: one notification a day, at an hour the person picks.
 *
 * It should feel like plancy greeting you, not a reminder that an app exists:
 * - its own soft chime (assets/sounds/plancy-morning.wav) instead of the
 *   system ding;
 * - a headline that knows the moment: a streak milestone within reach today,
 *   the start of a week or a month, a streak in progress, an empty day;
 * - the first three things planned, in the notification itself;
 * - two buttons, "See my day" and "Add a task", when you press and hold it.
 *
 * Opt-in (App Review treats habit nudges as marketing), and scheduled on the
 * phone a week ahead from what's known now; every change re-plans it, so the
 * last plan before the morning is the one that arrives.
 */
import * as Notifications from 'expo-notifications';

import { countsByDate, streak, tasksForDay } from '@/data/store';
import type { Settings, Task } from '@/data/types';
import { addDays, addMonths, formatMonthLong, fromIso, isoMonth, splitTime } from '@/lib/format';

export const NUDGE_DAYS = 7;
export const NUDGE_CATEGORY = 'plancy-nudge';
export const NUDGE_SOUND = 'plancy-morning.wav';

export type Nudge = { id: string; at: Date; title: string; subtitle: string; body: string };

const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 250, 300, 365];

let registered: Promise<unknown> | null = null;

/** The buttons under the nudge, registered once per launch. */
export function ensureNudgeActions(): Promise<unknown> {
  registered ??= Notifications.setNotificationCategoryAsync(NUDGE_CATEGORY, [
    { identifier: 'see-day', buttonTitle: 'See my day', options: { opensAppToForeground: true } },
    { identifier: 'add-task', buttonTitle: 'Add a task', options: { opensAppToForeground: true } },
  ]).catch(() => undefined);
  return registered;
}

export function planNudges(tasks: Task[], settings: Settings, today: string): Nudge[] {
  const out: Nudge[] = [];
  const now = Date.now();
  for (let i = 0; i < NUDGE_DAYS; i += 1) {
    const day = addDays(today, i);
    const at = fromIso(day);
    at.setHours(settings.nudgeHour, 0, 0, 0);
    if (at.getTime() <= now) continue;
    out.push({ id: `nudge-${day}`, at, ...composeNudge(tasks, settings, day) });
  }
  return out;
}

/** The notification for the morning of `day`. Exported for the Settings preview. */
export function composeNudge(tasks: Task[], settings: Settings, day: string): Omit<Nudge, 'id' | 'at'> {
  const open = tasksForDay(tasks, day).filter((t) => !t.done);
  // The streak as it will stand that morning: finished days before `day`.
  const days = streak(tasks, addDays(day, -1));
  const next = MILESTONES.find((m) => m === days + 1);
  const weekday = fromIso(day).getDay();
  const when = (t: Task) => {
    const { time, suffix } = splitTime(t.time, settings.hour12);
    return `${time}${suffix ? ` ${suffix}` : ''}`;
  };

  const plan = open.length === 0 ? 'Nothing planned yet' : `${open.length} planned, first at ${when(open[0])}`;

  let title: string;
  let subtitle = plan;
  if (open.length > 0 && next) {
    title = `Today could make it ${next} days`;
    subtitle = `Finish your list for a ${next}-day streak`;
  } else if (day.endsWith('-01')) {
    const last = addMonths(isoMonth(day), -1);
    const tally = tallyBetween(tasks, `${last}-01`, addDays(day, -1));
    title = `Hello, ${formatMonthLong(isoMonth(day)).split(' ')[0]}`;
    if (tally.total > 0) subtitle = `Last month: ${tally.done} of ${tally.total} done. ${plan}.`;
  } else if (weekday === 1) {
    const tally = tallyBetween(tasks, addDays(day, -7), addDays(day, -1));
    title = 'A fresh week';
    if (tally.total > 0) subtitle = `Last week: ${tally.done} of ${tally.total} done. ${plan}.`;
  } else if (open.length === 0) {
    title = 'A blank page';
    subtitle = 'What’s one thing worth doing today?';
  } else if (days >= 2) {
    title = `Day ${days + 1}. Keep it going`;
  } else {
    title = GREETINGS[dayIndex(day) % GREETINGS.length];
  }

  const lines = open.slice(0, 3).map((t) => `${when(t)}  ·  ${t.title}`);
  if (open.length > 3) lines.push(`and ${open.length - 3} more`);
  const body = lines.length > 0 ? lines.join('\n') : 'Open plancy and add the first thing. Small plans count.';

  return { title, subtitle, body };
}

/** The content every nudge shares: sound, buttons, and what a tap opens. */
export function nudgeContent(n: Omit<Nudge, 'id' | 'at'>, day: string): Notifications.NotificationContentInput {
  return {
    title: n.title,
    subtitle: n.subtitle,
    body: n.body,
    sound: NUDGE_SOUND,
    categoryIdentifier: NUDGE_CATEGORY,
    interruptionLevel: 'active',
    data: { nudge: true, date: day },
  };
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
  return Math.floor(fromIso(day).getTime() / 86_400_000);
}

const GREETINGS = ['Good morning', 'Morning. Here’s your day', 'Your day, at a glance', 'A new day, a short list', 'Good morning. Begin gently'];
