/**
 * plancy's haptic vocabulary.
 *
 * Screens ask for a meaning ("a task was ticked"), never a buzz, so the feel
 * can be retuned here without touching call sites. Feedback grows with
 * rarity: choosing things is a tap, finishing a task is firmer, finishing the
 * whole day is a success, and a streak milestone is the biggest thing plancy
 * plays. Each event has one owner: whichever handler made the change fires it.
 *
 * Settings → Haptics turns all of it off; the simulator plays nothing.
 */
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

let enabled = true;

export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

const later = (ms: number, fn: () => void) => setTimeout(fn, ms);

export function haptic(event: HapticEvent): void {
  if (!enabled) return;
  // Every call is fire-and-forget; a device without a Taptic Engine rejects
  // quietly and the app carries on.
  const run = (p: Promise<void>) => void p.catch(() => undefined);
  switch (event) {
    case 'select':
      return run(Haptics.selectionAsync());
    case 'tick':
      return run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    case 'untick':
      return run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    case 'reveal':
      return run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    case 'remove':
      return run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));
    case 'undo':
      return run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
    case 'saved':
      return run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
    case 'unlocked':
      return run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    case 'refused':
      return run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
    case 'dayDone':
      // A firm tap as the tick lands, then the success as the card changes.
      run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
      later(140, () => run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)));
      return;
    case 'milestone':
      // Three rising taps, then success: nothing else in the app feels like this.
      run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      later(90, () => run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)));
      later(180, () => run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)));
      later(400, () => run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)));
      return;
  }
}
