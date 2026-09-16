/**
 * What deserves a celebration when a task is ticked, and how big.
 *
 * Rarest wins, and only one thing is celebrated per tick:
 *   milestone  the streak reaches 3, 7, 14, 21, 30, 50, 100… days
 *   month      every planned day this month is done (at least a week of them)
 *   day        the last open task of a day
 *
 * Each moment is celebrated once per session, so unticking and ticking again
 * doesn't replay it. Pure, so the rules are easy to check.
 */
import { countsByDate, streak } from '@/data/store';
import type { Task } from '@/data/types';
import { formatMonthLong, isoMonth } from '@/lib/format';

export type Celebration =
  | { kind: 'day'; key: string }
  | { kind: 'milestone'; key: string; days: number; title: string; body: string }
  | { kind: 'month'; key: string; title: string; body: string };

const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 250, 300, 365];

function milestoneCopy(days: number): string {
  switch (days) {
    case 3:
      return 'Three days in a row. It’s becoming a habit.';
    case 7:
      return 'A full week of finished days.';
    case 14:
      return 'Two weeks straight. Keep the rhythm.';
    case 21:
      return 'Three weeks. This is just how you work now.';
    case 30:
      return 'A whole month of done.';
    case 365:
      return 'A whole year. Take a bow.';
    default:
      return `${days} days of finished lists. Remarkable.`;
  }
}

/**
 * `tasks` is the list *after* the tick. `date` is the day of the ticked task.
 * Returns null when this tick didn't finish its day, or it was already
 * celebrated this session.
 */
export function celebrationFor(tasks: Task[], date: string, today: string, seen: Set<string>): Celebration | null {
  const counts = countsByDate(tasks);
  const day = counts.get(date);
  if (!day || day.total === 0 || day.done < day.total) return null;

  if (date === today) {
    const days = streak(tasks, today);
    const key = `streak:${days}:${today}`;
    if (MILESTONES.includes(days) && !seen.has(key)) {
      seen.add(key);
      return { kind: 'milestone', key, days, title: `${days}-day streak`, body: milestoneCopy(days) };
    }
  }

  const month = isoMonth(date);
  if (month === isoMonth(today) && date <= today) {
    const planned = [...counts].filter(([d, c]) => isoMonth(d) === month && c.total > 0);
    const spotless = planned.length >= 7 && planned.every(([, c]) => c.done === c.total);
    const key = `month:${month}`;
    if (spotless && !seen.has(key)) {
      seen.add(key);
      const name = formatMonthLong(month).split(' ')[0];
      return { kind: 'month', key, title: `${name}, spotless`, body: `All ${planned.length} planned days this month, done.` };
    }
  }

  const key = `day:${date}`;
  if (seen.has(key)) return null;
  seen.add(key);
  return { kind: 'day', key };
}
