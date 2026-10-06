/**
 * Task reminders, scheduled on the phone itself.
 *
 * This replaces the web planner's three delivery paths (server push, the
 * calendar feed, in-tab banners) with one: iOS holds the alarms, so they fire
 * with the app closed and with no internet. iOS caps pending notifications at
 * 64 per app, so only the coming week is scheduled and topped up on each
 * change. The nudges (see nudges.ts) share the budget: plancy keeps 60, each
 * nudge that's switched on reserves a week of its own, and reminders get the
 * rest — 60 with neither nudge, 53 with one, 46 with both.
 */
import * as Notifications from 'expo-notifications';

import type { Settings, Task } from '@/data/types';
import { addDays, splitTime, todayIso } from '@/lib/format';
import { composeEvening, composeNudge, ensureNudgeActions, NUDGE_DAYS, nudgeContent, planEvenings, planNudges } from '@/lib/nudges';

const HORIZON_DAYS = 7;
/** Four under iOS's 64, so a preview always has room. */
const PENDING = 60;

/** How many task reminders fit beside the nudges that are on. */
export function reminderBudget(settings: Pick<Settings, 'nudge' | 'evening'>): number {
  return PENDING - (settings.nudge ? NUDGE_DAYS : 0) - (settings.evening ? NUDGE_DAYS : 0);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Notification permission, split in two on purpose.
 *
 * iOS shows the system prompt exactly once per install. Spend it on app
 * launch, before the person has seen what plancy does, and a "no" is
 * permanent — the app can never ask again, and reminders are gone for good.
 * So scheduling reads the permission and never asks; asking belongs to a
 * moment the person chose (a switch turned on, Allow tapped in onboarding).
 */

/** Read-only. Never prompts. */
export async function hasPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Ask iOS. Only ever call this from something the person just did. */
export async function askPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export type PermissionState =
  /** iOS will deliver notifications. */
  | 'granted'
  /** Not granted yet, and iOS will still show the prompt. */
  | 'ask'
  /** Refused already: the prompt is spent, and only iOS Settings can undo it. */
  | 'blocked';

export async function permissionState(): Promise<PermissionState> {
  const c = await Notifications.getPermissionsAsync();
  if (c.granted) return 'granted';
  return c.canAskAgain ? 'ask' : 'blocked';
}

let pending: Promise<void> = Promise.resolve();

/** Replace every scheduled reminder with the current plan. Calls are serialised. */
export function syncReminders(tasks: Task[], settings: Settings): Promise<void> {
  pending = pending.then(() => reschedule(tasks, settings)).catch(() => undefined);
  return pending;
}

const PREVIEW_ID = 'nudge-preview';

async function reschedule(tasks: Task[], settings: Settings): Promise<void> {
  // Everything plancy planned goes, except a preview that is about to arrive.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier !== PREVIEW_ID) await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }
  if (!settings.remind && !settings.nudge && !settings.evening) return;
  // Reads the permission, never asks for it. A new install therefore reaches
  // the first screen without a system prompt; Settings shows the person that
  // reminders need permission, and onboarding is where plancy asks.
  if (!(await hasPermission())) return;

  const today = todayIso();
  if (settings.nudge) {
    await ensureNudgeActions();
    for (const n of planNudges(tasks, settings, today)) {
      await Notifications.scheduleNotificationAsync({
        identifier: n.id,
        content: nudgeContent(n, n.id.slice('nudge-'.length)),
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at },
      });
    }
  }
  if (settings.evening) {
    for (const n of planEvenings(tasks, settings, today)) {
      await Notifications.scheduleNotificationAsync({
        identifier: n.id,
        content: nudgeContent(n, n.id.slice('evening-'.length), false),
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at },
      });
    }
  }
  for (const { task, at } of planReminders(tasks, settings, today)) {
    const { time, suffix } = splitTime(task.time, settings.hour12);
    await Notifications.scheduleNotificationAsync({
      identifier: task.id,
      content: {
        title: task.title,
        body: settings.leadMinutes === 0 ? `Now, ${time} ${suffix}`.trim() : `In ${settings.leadMinutes} min, ${time} ${suffix}`.trim(),
        data: { taskId: task.id, date: task.date },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at) },
    });
  }
}

/**
 * The reminders to schedule: the coming week's open, timed tasks, soonest
 * first, each `leadMinutes` before its time, never in the past, and never
 * more than the budget left after the nudges. Empty when reminders are off.
 */
export function planReminders(tasks: Task[], settings: Settings, today: string): { task: Task; at: number }[] {
  if (!settings.remind) return [];
  const last = addDays(today, HORIZON_DAYS);
  const now = Date.now();
  const lead = settings.leadMinutes * 60_000;
  return (
    tasks
      // Anytime tasks have no time to remind at; a task can also opt out.
      .filter((t) => !t.done && t.remind && t.time !== '' && t.date >= today && t.date <= last)
      .map((t) => ({ task: t, at: whenEpoch(t) - lead }))
      .filter((x) => x.at > now)
      .sort((a, b) => a.at - b.at)
      .slice(0, reminderBudget(settings))
  );
}

function whenEpoch(task: Task): number {
  const [y, m, d] = task.date.split('-').map(Number);
  const [hh, mm] = task.time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
}

/**
 * Sends today's morning nudge, or tonight's check-in, a few seconds from now,
 * so it can be seen and heard without waiting. Leave plancy (or lock the
 * phone) to see it as it will really arrive. 'empty' means tonight has
 * nothing open, so no check-in would come.
 */
export async function previewNudge(
  tasks: Task[],
  settings: Settings,
  inSeconds = 5,
  which: 'morning' | 'evening' = 'morning',
): Promise<'sent' | 'blocked' | 'empty'> {
  const today = todayIso();
  const words = which === 'morning' ? composeNudge(tasks, settings, today) : composeEvening(tasks, settings, today);
  if (!words) return 'empty';
  // A tap on "Send a preview" is an explicit request, so asking here is fair.
  if (!(await askPermission())) return 'blocked';
  await ensureNudgeActions();
  await Notifications.cancelScheduledNotificationAsync(PREVIEW_ID).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: PREVIEW_ID,
    content: nudgeContent(words, today, which === 'morning'),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: inSeconds },
  });
  return 'sent';
}
