/**
 * Task reminders, scheduled on the phone itself.
 *
 * This replaces the web planner's three delivery paths (server push, the
 * calendar feed, in-tab banners) with one: iOS holds the alarms, so they fire
 * with the app closed and with no internet. iOS caps pending notifications at
 * 64 per app, so only the coming week is scheduled and topped up on each
 * change.
 */
import * as Notifications from 'expo-notifications';

import type { Settings, Task } from '@/data/types';
import { addDays, splitTime, todayIso } from '@/lib/format';

const HORIZON_DAYS = 7;
const MAX_PENDING = 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

let pending: Promise<void> = Promise.resolve();

/** Replace every scheduled reminder with the current plan. Calls are serialised. */
export function syncReminders(tasks: Task[], settings: Settings): Promise<void> {
  pending = pending.then(() => reschedule(tasks, settings)).catch(() => undefined);
  return pending;
}

async function reschedule(tasks: Task[], settings: Settings): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.remind) return;
  if (!(await ensurePermission())) return;

  const today = todayIso();
  const last = addDays(today, HORIZON_DAYS);
  const now = Date.now();
  const lead = settings.leadMinutes * 60_000;

  const due = tasks
    .filter((t) => !t.done && t.date >= today && t.date <= last)
    .map((t) => ({ task: t, at: whenEpoch(t) - lead }))
    .filter((x) => x.at > now)
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_PENDING);

  for (const { task, at } of due) {
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

function whenEpoch(task: Task): number {
  const [y, m, d] = task.date.split('-').map(Number);
  const [hh, mm] = task.time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
}
