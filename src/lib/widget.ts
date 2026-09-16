/**
 * Feeds the home screen widget.
 *
 * WidgetKit shows whatever it was last given, so the app hands it a small
 * timeline: today's numbers now, then a fresh entry for each of the next few
 * midnights, so the widget rolls over to the new day even if plancy isn't
 * opened. Every change in the store calls this again.
 */
import type { Settings, Task } from '@/data/types';
import { addDays, formatDayShort, fromIso, splitTime, todayIso } from '@/lib/format';
import { accentFor } from '@/theme/palette';

import { streak, tasksForDay } from '@/data/store';
import TodayWidget, { type TodayWidgetProps } from '../../widgets/TodayWidget';

const DAYS_AHEAD = 3;

export function syncWidget(tasks: Task[], settings: Settings): void {
  const today = todayIso();
  const entries = [];
  for (let i = 0; i <= DAYS_AHEAD; i += 1) {
    const day = addDays(today, i);
    const at = i === 0 ? new Date() : fromIso(day);
    entries.push({ date: at, props: propsFor(tasks, settings, day, today) });
  }
  try {
    TodayWidget.updateTimeline(entries);
  } catch {
    // A build without the widget extension (an old install, or the simulator
    // before a native rebuild) has nothing to update. The app carries on.
  }
}

function propsFor(tasks: Task[], settings: Settings, day: string, today: string): TodayWidgetProps {
  const list = tasksForDay(tasks, day);
  const done = list.filter((t) => t.done).length;
  const next = list
    .filter((t) => !t.done)
    .slice(0, 4)
    .map((t) => {
      const { time, suffix } = splitTime(t.time, settings.hour12);
      return { time: `${time}${suffix ? ` ${suffix}` : ''}`, title: t.title };
    });
  // Future days see the streak as it stands now; the widget can't know what
  // happens between now and then.
  const days = streak(tasks, today);
  return {
    day: formatDayShort(day).replace(/,/g, ''),
    done,
    total: list.length,
    streak: days,
    next,
    style: settings.widgetStyle,
    // The widget can't read our theme, so the accent is sent ready-made. It
    // renders on the system's own light/dark background, so the light-mode
    // accent is a fair middle ground; the dark one lifts pale colours too far.
    accent: accentFor(settings.accent, 'light'),
  };
}
