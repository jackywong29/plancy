/**
 * Keeps the home screen widget and plancy's data in step, both ways.
 *
 * App → widget: a small timeline, today now plus each of the next few
 * midnights, so the widget rolls over to a new day even if plancy isn't
 * opened. Rewritten on every change.
 *
 * Widget → app: tasks ticked on the widget are saved by iOS in the widget's
 * own timeline, listed in `touched`. Before plancy writes a new timeline it
 * reads those, applies them to its data, and only then overwrites the
 * timeline, so a tick made on the home screen is never lost. This runs on
 * every change, whenever plancy comes to the front, and straight away when a
 * widget tap happens while plancy is running.
 */
import { addUserInteractionListener } from 'expo-widgets';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { asOf } from '@/data/carry';
import { streak, tasksForDay } from '@/data/select';
import type { Settings, Task } from '@/data/types';
import { addDays, formatDayShort, fromIso, splitTime, todayIso } from '@/lib/format';
import { accentFor } from '@/theme/palette';

import TodayWidget, { type TodayWidgetProps } from '../../widgets/TodayWidget';

const DAYS_AHEAD = 3;
const MAX_TASKS = 12;

type TaskDone = { id: string; done: boolean };

let queue: Promise<void> = Promise.resolve();

/** Mount once, at the root. */
export function useWidgetSync(tasks: Task[], settings: Settings, setTasksDone: (changes: TaskDone[]) => void) {
  const latest = useRef({ tasks, settings, setTasksDone });
  latest.current = { tasks, settings, setTasksDone };

  useEffect(() => {
    schedule(latest);
  }, [tasks, settings]);

  useEffect(() => {
    const onActive = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule(latest);
    });
    let onTap: { remove(): void } | null = null;
    try {
      onTap = addUserInteractionListener(() => schedule(latest));
    } catch {
      // No widget extension in this build.
    }
    return () => {
      onActive.remove();
      onTap?.remove();
    };
  }, []);
}

type Latest = { current: { tasks: Task[]; settings: Settings; setTasksDone: (changes: TaskDone[]) => void } };

function schedule(latest: Latest) {
  queue = queue.then(() => reconcile(latest)).catch(() => undefined);
}

async function reconcile(latest: Latest): Promise<void> {
  const { tasks, settings, setTasksDone } = latest.current;
  let entries: { props: Partial<TodayWidgetProps> }[] = [];
  try {
    entries = (await TodayWidget.getTimeline()) as typeof entries;
  } catch {
    return; // No widget extension in this build.
  }

  // Ticks made on the widget that plancy doesn't have yet.
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const changes = new Map<string, boolean>();
  for (const entry of entries) {
    const props = entry?.props ?? {};
    for (const id of props.touched ?? []) {
      const onWidget = props.tasks?.find((t) => t.id === id);
      const inApp = byId.get(id);
      if (onWidget && inApp && onWidget.done !== inApp.done) changes.set(id, onWidget.done);
    }
  }
  if (changes.size > 0) {
    // The store update re-runs this with the new tasks, which then writes.
    setTasksDone([...changes].map(([id, done]) => ({ id, done })));
    return;
  }

  write(tasks, settings);
}

function write(tasks: Task[], settings: Settings) {
  const today = todayIso();
  const todayFacts = factsFor(tasks, today);
  const entries = [];
  for (let i = 0; i <= DAYS_AHEAD; i += 1) {
    const day = addDays(today, i);
    entries.push({ date: i === 0 ? new Date() : fromIso(day), props: propsFor(tasks, settings, day, today, todayFacts) });
  }
  try {
    TodayWidget.updateTimeline(entries);
  } catch {
    // No widget extension in this build.
  }
}

type TodayFacts = { todayDone: boolean; streak: number };

/** What every day's entry needs to know about today; worked out once per write. */
function factsFor(tasks: Task[], today: string): TodayFacts {
  const todayList = tasksForDay(tasks, today);
  return { todayDone: todayList.length > 0 && todayList.every((t) => t.done), streak: streak(tasks, today) };
}

/** What the widget is sent for `day`. Exported for the widget tests. */
export function propsFor(
  tasks: Task[],
  settings: Settings,
  day: string,
  today: string,
  { todayDone, streak: current }: TodayFacts = factsFor(tasks, today),
): TodayWidgetProps {
  // The whole-app lock means nothing leaves the app unlocked, including
  // task names on the Lock Screen and home screen widgets, so they aren't
  // even sent.
  const hidden = settings.lockEnabled && settings.lockScope === 'app';
  // A later day shows today's leftovers already moved in, as plancy will
  // when it next opens (iOS doesn't wake it at midnight to do it then).
  const list = tasksForDay(asOf(tasks, day, settings), day);
  // Open tasks first, then finished ones, each in time order.
  const ordered = [...list.filter((t) => !t.done), ...list.filter((t) => t.done)].slice(0, MAX_TASKS);
  return {
    date: day,
    day: formatDayShort(day).replace(/,/g, ''),
    tasks: ordered.map((t) => {
      const title = hidden ? '' : t.title;
      if (t.time === '') return { id: t.id, time: '', title, done: t.done };
      const { time, suffix } = splitTime(t.time, settings.hour12);
      return { id: t.id, time: `${time}${suffix ? ` ${suffix}` : ''}`, title, done: t.done };
    }),
    // For today the widget adds one itself once everything is ticked. Later
    // days can only know the streak as it stands now.
    streakBefore: day === today ? current - (todayDone ? 1 : 0) : current,
    style: settings.widgetStyle,
    // The widget draws on its own light or dark card, so the light-mode
    // accent is the fair middle ground.
    accent: accentFor(settings.accent, 'light'),
    touched: [],
    private: hidden,
  };
}
