/**
 * A moment's pause before a ticked row moves.
 *
 * Ticking something sends it to the bottom of its list (finished anytime
 * tasks, done ideas). Moving it the instant it's tapped hides the tick itself
 * — the row leaves before the eye has seen it land. So a ticked row is held
 * in its old place for SETTLE_MS, then glides to the new one. Tapping it again
 * inside that window cancels the move, since it's back where it started.
 *
 * `held` maps an id to the done state its row should be *placed* by while it
 * waits (what it was before the tap). Rows still draw their real state.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export const SETTLE_MS = 600;

export function useSettle() {
  const [held, setHeld] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const release = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setHeld((m) => {
      if (!m.has(id)) return m;
      const next = new Map(m);
      next.delete(id);
      return next;
    });
  }, []);

  /**
   * Hold `id` where a row with done = `placedAs` sits. When the time is up,
   * `due` runs (to animate the move, then release), or the row is released.
   */
  const hold = useCallback(
    (id: string, placedAs: boolean, due?: (id: string) => void) => {
      if (timers.current.has(id)) {
        release(id);
        return;
      }
      setHeld((m) => new Map(m).set(id, placedAs));
      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id);
          (due ?? release)(id);
        }, SETTLE_MS),
      );
    },
    [release],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  /** The done state to place a row by: held, or its own. */
  const placedDone = useCallback((item: { id: string; done: boolean }) => held.get(item.id) ?? item.done, [held]);

  return { held, hold, release, placedDone };
}
