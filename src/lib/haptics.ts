/**
 * plancy's haptic vocabulary.
 *
 * Screens ask for a meaning ("a task was ticked"), never a buzz, so the feel
 * can be retuned here without touching call sites. Feedback grows with
 * rarity: choosing things is a keyboard-like click, ticking is firmer,
 * finishing the whole day is a pattern timed to its animation, and a streak
 * milestone is the biggest thing plancy plays. Each event has one owner:
 * whichever handler made the change fires it.
 *
 * Patterns play through modules/plancy-haptics (Core Haptics). expo-haptics
 * is only a fallback for a build without that module: its window-less
 * generators play nothing on iOS 27, which is why haptics were silent.
 *
 * Settings → Haptics turns all of it off; the simulator plays nothing.
 */
import { requireOptionalNativeModule } from 'expo';
import * as Haptics from 'expo-haptics';

export type HapticEvent =
  /** Picking something: a day, a chip, a segment, a colour, a month. */
  | 'select'
  /** A task, idea or bill marked done. */
  | 'tick'
  /** Marked not done again. */
  | 'untick'
  /** Swipe actions slid into view. */
  | 'reveal'
  /** Something deleted (Undo is on offer). */
  | 'remove'
  /** Undo tapped. */
  | 'undo'
  /** A new task, idea or entry saved. */
  | 'saved'
  /** Face ID accepted / refused. */
  | 'unlocked'
  | 'refused'
  /** The last open task of the day ticked. */
  | 'dayDone'
  /** A streak milestone or a spotless month. The rarest, so the biggest. */
  | 'milestone';

/** [seconds, intensity 0–1, sharpness 0–1] is a tap; add a duration for a sustained buzz. */
type Row = [number, number, number] | [number, number, number, number];

/*
 * Timings for the celebrations follow the animations they accompany:
 * - the tick shrinks for 90ms, then springs back;
 * - "today, done." drops its dot on a spring (damping 7, stiffness 220) that
 *   first lands ~0.11s after it starts and bounces back through ~0.33s and
 *   ~0.55s; the render adds about a frame or two;
 * - the milestone card appears at 0.65s and springs to full size by ~0.8s.
 */
const DAY_DONE: Row[] = [
  [0, 0.85, 0.55], // the tick
  [0.04, 0.3, 0.1, 0.22], // the burst leaving the card
  [0.14, 1, 0.35], // the dot lands
  [0.36, 0.5, 0.45], // first bounce
  [0.58, 0.28, 0.4], // settles
];

const PATTERNS: Record<HapticEvent, Row[]> = {
  // Short and crisp, like a key on the iOS keyboard.
  select: [[0, 0.55, 0.9]],
  tick: [
    [0, 0.85, 0.55],
    [0.09, 0.35, 0.7],
  ],
  untick: [[0, 0.45, 0.5]],
  reveal: [[0, 0.4, 0.95]],
  remove: [
    [0, 0.75, 0.95],
    [0.06, 0.35, 0.3],
  ],
  undo: [[0, 0.5, 0.25]],
  saved: [
    [0, 0.55, 0.6],
    [0.09, 0.8, 0.5],
  ],
  unlocked: [
    [0, 0.55, 0.4],
    [0.1, 0.85, 0.55],
  ],
  refused: [
    [0, 0.8, 0.8],
    [0.12, 0.8, 0.8],
    [0.24, 0.6, 0.8],
  ],
  dayDone: DAY_DONE,
  milestone: [
    ...DAY_DONE,
    [0.66, 0.45, 0.8], // the card appears…
    [0.74, 0.65, 0.8], // …grows…
    [0.8, 0.45, 0.2, 0.25], // …swells…
    [0.82, 0.85, 0.8],
    [0.96, 1, 0.6], // …and lands
  ],
};

type NativeHaptics = { isSupported(): boolean; play(rows: Row[]): Promise<void> };

const native = requireOptionalNativeModule<NativeHaptics>('PlancyHaptics');

let enabled = true;

export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

export function haptic(event: HapticEvent): void {
  if (!enabled) return;
  if (native) {
    native.play(PATTERNS[event]).catch(() => undefined);
    return;
  }
  fallback(event);
}

function fallback(event: HapticEvent): void {
  const run = (p: Promise<void>) => void p.catch(() => undefined);
  if (event === 'select' || event === 'reveal') return run(Haptics.selectionAsync());
  if (event === 'dayDone' || event === 'milestone' || event === 'unlocked') {
    return run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  }
  if (event === 'refused') return run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  run(Haptics.impactAsync(event === 'tick' || event === 'saved' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light));
}
