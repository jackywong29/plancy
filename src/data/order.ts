/**
 * The order tasks appear in on a day, and moving anytime tasks around.
 *
 * Timed tasks are ordered by the clock and can't be dragged: the list has to
 * agree with the times, or it's lying. Anytime tasks (no time) sit after them
 * in an order the person sets, kept in `position`.
 */
import type { Task } from './types';

export const isAnytime = (t: Pick<Task, 'time'>): boolean => t.time === '';

/** A day's tasks: timed by the clock, then anytime by position. */
export function dayOrder(list: Task[]): Task[] {
  const timed = list
    .filter((t) => !isAnytime(t))
    .sort((a, b) => (a.time === b.time ? a.createdAt - b.createdAt : a.time.localeCompare(b.time)));
  const anytime = list
    .filter(isAnytime)
    .sort((a, b) => (a.position === b.position ? a.createdAt - b.createdAt : a.position - b.position));
  return [...timed, ...anytime];
}

/** `ids` with the item at `from` moved to `to`; out-of-range indexes clamp. */
export function move<T>(ids: T[], from: number, to: number): T[] {
  if (from < 0 || from >= ids.length) return ids.slice();
  const next = ids.slice();
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
}

/** The position a new anytime task takes on `date`: after the last one. */
export function nextPosition(tasks: Task[], date: string): number {
  let max = -1;
  for (const t of tasks) if (t.date === date && isAnytime(t) && t.position > max) max = t.position;
  return max + 1;
}

/*
 * Drag maths for components/sortable.tsx. They run on the UI thread
 * ('worklet') but are pure, so they live here where they can be tested.
 * `heights` is each row's height, top to bottom; `from` is the held row.
 */

/**
 * Which slot the held row now belongs in. It passes a neighbour once its
 * leading edge crosses that neighbour's middle: the bottom edge when moving
 * down, the top edge when moving up. Everything is measured in the list's
 * original layout, with the held row still in its own place.
 */
export function slotFor(from: number, dy: number, heights: number[]): number {
  'worklet';
  const tops: number[] = [];
  let y = 0;
  for (let i = 0; i < heights.length; i += 1) {
    tops.push(y);
    y += heights[i] ?? 0;
  }
  const top = (tops[from] ?? 0) + dy;
  const bottom = top + (heights[from] ?? 0);
  let slot = from;
  for (let i = from + 1; i < heights.length; i += 1) {
    if (bottom > tops[i] + (heights[i] ?? 0) / 2) slot = i;
  }
  for (let i = from - 1; i >= 0; i -= 1) {
    if (top < tops[i] + (heights[i] ?? 0) / 2) slot = i;
  }
  return slot;
}

/** How far the held row must travel to sit in slot `to`. */
export function offsetTo(from: number, to: number, heights: number[]): number {
  'worklet';
  let d = 0;
  if (to > from) for (let i = from + 1; i <= to; i += 1) d += heights[i] ?? 0;
  else for (let i = to; i < from; i += 1) d -= heights[i] ?? 0;
  return d;
}
