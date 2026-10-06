/**
 * The nudges: a morning one with the day's plan, and an evening check-in
 * when something is still open. Each is a notification at an hour the person
 * picks, and both are opt-in (App Review treats habit nudges as marketing).
 *
 * They should feel like plancy greeting you, not a reminder that an app
 * exists:
 * - their own soft chime (assets/sounds/plancy-morning.wav) instead of the
 *   system ding;
 * - a headline that knows the moment: a streak milestone within reach today,
 *   the start of a week or a month, leftovers carried over, a streak in
 *   progress, yesterday finished, an empty day;
 * - the first three things planned, in the notification itself;
 * - in the morning, "See my day" and "Add a task" when you press and hold it.
 *
 * They count what was done, never what wasn't: "You finished 18 things last
 * week", not "18 of 22". Three voices say it — warm, gentle, playful — and
 * 'mix' takes turns with them, a day each.
 *
 * Planned on the phone a week ahead from what's known now, with carry-over
 * applied to each day as it will be by then (data/carry.ts). Every change
 * re-plans them, so the last plan before the hour is the one that arrives.
 */
import * as Notifications from 'expo-notifications';

import { asOf } from '@/data/carry';
import { countsByDate, streak, tasksForDay } from '@/data/select';
import type { Settings, Task } from '@/data/types';
import { addDays, addMonths, formatMonthLong, fromIso, isoMonth, splitTime } from '@/lib/format';

export const NUDGE_DAYS = 7;
export const NUDGE_CATEGORY = 'plancy-nudge';
export const NUDGE_SOUND = 'plancy-morning.wav';

export type Nudge = { id: string; at: Date; title: string; subtitle: string; body: string };
type Words = Omit<Nudge, 'id' | 'at'>;

const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 250, 300, 365];

let registered: Promise<unknown> | null = null;

/** The buttons under the morning nudge, registered once per launch. */
export function ensureNudgeActions(): Promise<unknown> {
  registered ??= Notifications.setNotificationCategoryAsync(NUDGE_CATEGORY, [
    { identifier: 'see-day', buttonTitle: 'See my day', options: { opensAppToForeground: true } },
    { identifier: 'add-task', buttonTitle: 'Add a task', options: { opensAppToForeground: true } },
  ]).catch(() => undefined);
  return registered;
}

/* ---------- voices ---------- */

export type Voice = Exclude<Settings['nudgeVoice'], 'mix'>;
const VOICES: Voice[] = ['warm', 'gentle', 'playful'];

const things = (n: number) => (n === 1 ? '1 thing' : `${n} things`);

/** Each moment a nudge can open with, in each voice. `plan` reads like "3 planned, first at 9:00 am". */
type Copy = {
  milestone: (next: number) => [string, string];
  month: (name: string, done: number, plan: string) => [string, string];
  week: (done: number, plan: string) => [string, string];
  carried: (n: number) => [string, string];
  /** Yesterday finished (`total` tasks), the day before not: a streak of one. */
  fullDay: (total: number, plan: string) => [string, string];
  empty: [string, string];
  /** The title for a streak of `days`; the plan goes under it. */
  streak: (days: number) => string;
  /** Ordinary mornings, a different one each day. */
  greetings: string[];
  evening: (open: number, carryOver: boolean) => [string, string];
};

const COPY: Record<Voice, Copy> = {
  warm: {
    milestone: (next) => [`Today could make it ${next} days`, `Finish your list for a ${next}-day streak`],
    month: (name, done, plan) => [`Hello, ${name}`, done ? `You finished ${things(done)} last month. ${plan}.` : `${plan}.`],
    week: (done, plan) => ['New week, clean slate', done ? `You finished ${things(done)} last week. ${plan}.` : `${plan}.`],
    carried: (n) => ['Fresh start', `${n} came over from yesterday. Today’s a new go.`],
    fullDay: (total, plan) => [total > 1 ? `Yesterday: all ${total} done. Nice.` : 'Yesterday: done. Nice.', plan],
    empty: ['A clear day', 'Add one thing you’d be glad to have done'],
    streak: (days) => `${days} days running. Make it ${days + 1}`,
    greetings: ['You’ve got this', 'Good morning. Let’s go', 'Morning! One thing at a time', 'Today’s yours', 'Good morning, you'],
    evening: (open, carryOver) => [
      `${open} left today`,
      carryOver ? 'Still time for one. Anything unfinished moves to tomorrow.' : 'Still time to tick one off.',
    ],
  },
  gentle: {
    milestone: (next) => [`${next} days is within reach`, 'One finished list away'],
    month: (name, done, plan) => [`${name}, gently`, done ? `Last month you finished ${things(done)}. ${plan}.` : `${plan}.`],
    week: (done, plan) => ['A new week, gently', done ? `Last week you finished ${things(done)}. ${plan}.` : `${plan}.`],
    carried: (n) => ['No rush', `${n} from yesterday came along. ${n === 1 ? 'It’ll' : 'They’ll'} keep.`],
    fullDay: (total, plan) => ['Yesterday went well', `${total > 1 ? `All ${total}` : 'All'} done. Today: ${plan}.`],
    empty: ['Room to breathe', 'If one thing would make today good, add it'],
    streak: (days) => `${days} good days in a row`,
    greetings: ['Good morning. One step at a time', 'Good morning. Begin gently', 'A new day, a short list', 'Morning. Here’s your day', 'Easy does it today'],
    evening: (open, carryOver) => [
      'Winding down',
      carryOver ? `${open} still open. Whatever’s left moves to tomorrow.` : `${open} still open, if you have the energy.`,
    ],
  },
  playful: {
    milestone: (next) => [`${next}-day streak, loading…`, 'Finish today’s list to unlock it'],
    month: (name, done, plan) => [`${name}, here we go`, done ? `${things(done)} done last month. ${plan}.` : `${plan}.`],
    week: (done, plan) => ['Monday, but make it good', done ? `${things(done)} done last week. ${plan}.` : `${plan}.`],
    carried: (n) => ['Yesterday’s leftovers', `${n} tagged along. Easy pickings.`],
    fullDay: (_total, plan) => ['You cleared the lot yesterday', `Encore? ${plan}.`],
    empty: ['A blank page, all yours', 'What’s the one thing worth doing?'],
    streak: (days) => `${days} days on fire`,
    greetings: ['Rise and plan', 'Morning, superstar', 'Let’s make today count', 'Your list says hi', 'Coffee first, then this'],
    evening: (open, carryOver) => [
      'Evening check-in',
      carryOver ? `${open} to go. Leftovers roll over to tomorrow.` : `${open} to go. You’ve got this.`,
    ],
  },
};

/** The voice for `day`: the one chosen, or with 'mix', the next of the three each day. */
export function voiceFor(settings: Pick<Settings, 'nudgeVoice'>, day: string): Voice {
  return settings.nudgeVoice === 'mix' ? VOICES[dayIndex(day) % VOICES.length] : settings.nudgeVoice;
}

/* ---------- planning ---------- */

/** The notification time on `day` at `hour`, or null once it has passed. */
function hourOn(day: string, hour: number, now: number): Date | null {
  const at = fromIso(day);
  at.setHours(hour, 0, 0, 0);
  return at.getTime() > now ? at : null;
}

export function planNudges(tasks: Task[], settings: Settings, today: string): Nudge[] {
  const out: Nudge[] = [];
  const now = Date.now();
  for (let i = 0; i < NUDGE_DAYS; i += 1) {
    const day = addDays(today, i);
    const at = hourOn(day, settings.nudgeHour, now);
    if (at) out.push({ id: `nudge-${day}`, at, ...composeNudge(tasks, settings, day) });
  }
  return out;
}

/** Evening check-ins for the coming week, on the days something is still open. */
export function planEvenings(tasks: Task[], settings: Settings, today: string): Nudge[] {
  const out: Nudge[] = [];
  const now = Date.now();
  for (let i = 0; i < NUDGE_DAYS; i += 1) {
    const day = addDays(today, i);
    const at = hourOn(day, settings.eveningHour, now);
    const words = at ? composeEvening(tasks, settings, day) : null;
    if (at && words) out.push({ id: `evening-${day}`, at, ...words });
  }
  return out;
}

/** "7:00 am", or "Anytime". */
function when(t: Task, hour12: boolean): string {
  if (t.time === '') return 'Anytime';
  const { time, suffix } = splitTime(t.time, hour12);
  return `${time}${suffix ? ` ${suffix}` : ''}`;
}

/** "7:00 am  ·  Run", the first three, then "and 2 more". */
function lines(open: Task[], hour12: boolean): string[] {
  const out = open.slice(0, 3).map((t) => `${when(t, hour12)}  ·  ${t.title}`);
  if (open.length > 3) out.push(`and ${open.length - 3} more`);
  return out;
}

/** The notification for the morning of `day`. Exported for the Settings preview. */
export function composeNudge(tasks: Task[], settings: Settings, day: string): Words {
  // The day as it will be that morning, leftovers carried in.
  const view = asOf(tasks, day, settings);
  const copy = COPY[voiceFor(settings, day)];
  const open = tasksForDay(view, day).filter((t) => !t.done);
  const counts = countsByDate(view);
  const before = addDays(day, -1);
  const yesterday = counts.get(before);
  const yesterdayFull = !!yesterday && yesterday.total > 0 && yesterday.done === yesterday.total;
  // The streak as it will stand that morning. Yesterday is over by then, so
  // an unfinished yesterday has ended it.
  const days = yesterdayFull ? streak(view, before) : 0;
  const next = MILESTONES.find((m) => m === days + 1);
  const carried = open.filter((t) => t.carriedFrom.includes(before)).length;
  const weekday = fromIso(day).getDay();

  // Timed tasks come first in a day's order, so open[0] is the earliest
  // timed one when there is any. A day of only anytime tasks has no "first at".
  const [first] = open;
  const plan =
    open.length === 0
      ? 'Nothing planned yet'
      : first.time === ''
        ? `${open.length} planned`
        : `${open.length} planned, first at ${when(first, settings.hour12)}`;

  let title: string;
  let subtitle = plan;
  if (open.length > 0 && next) {
    [title, subtitle] = copy.milestone(next);
  } else if (day.endsWith('-01')) {
    const last = addMonths(isoMonth(day), -1);
    [title, subtitle] = copy.month(formatMonthLong(isoMonth(day)).split(' ')[0], doneBetween(view, `${last}-01`, before), plan);
  } else if (weekday === 1) {
    [title, subtitle] = copy.week(doneBetween(view, addDays(day, -7), before), plan);
  } else if (open.length === 0) {
    [title, subtitle] = copy.empty;
  } else if (carried > 0) {
    [title, subtitle] = copy.carried(carried);
  } else if (days >= 2) {
    title = copy.streak(days);
  } else if (days === 1 && yesterday) {
    [title, subtitle] = copy.fullDay(yesterday.total, plan);
  } else {
    title = copy.greetings[dayIndex(day) % copy.greetings.length];
  }

  const body = open.length > 0 ? lines(open, settings.hour12).join('\n') : 'Open plancy and add the first thing. Small plans count.';
  return { title, subtitle, body };
}

/** The evening check-in for `day`, or null when nothing is left open that day. */
export function composeEvening(tasks: Task[], settings: Settings, day: string): Words | null {
  const open = tasksForDay(asOf(tasks, day, settings), day).filter((t) => !t.done);
  if (open.length === 0) return null;
  const [title, subtitle] = COPY[voiceFor(settings, day)].evening(open.length, settings.carryOver);
  return { title, subtitle, body: lines(open, settings.hour12).join('\n') };
}

/** What every nudge shares: the chime, and what a tap opens. Mornings add their buttons. */
export function nudgeContent(n: Words, day: string, buttons = true): Notifications.NotificationContentInput {
  return {
    title: n.title,
    subtitle: n.subtitle,
    body: n.body,
    sound: NUDGE_SOUND,
    ...(buttons ? { categoryIdentifier: NUDGE_CATEGORY } : {}),
    interruptionLevel: 'active',
    data: { nudge: true, date: day },
  };
}

/** Tasks finished from `from` to `to`, inclusive. */
function doneBetween(tasks: Task[], from: string, to: string): number {
  let done = 0;
  for (const [date, c] of countsByDate(tasks)) if (date >= from && date <= to) done += c.done;
  return done;
}

/** A stable number for a day, so things rotate but never repeat two days running. */
function dayIndex(day: string): number {
  return Math.floor(fromIso(day).getTime() / 86_400_000);
}
