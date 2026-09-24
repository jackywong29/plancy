/**
 * What the add button does, which depends on where you are.
 *
 * There is one add button for the whole app, centred above the tab bar (see
 * app/(tabs)/_layout.tsx). It means something different on each tab: a task
 * on Today, the day's entry on Journal, an idea on Ideas, a money entry on
 * Finance. Each tab registers its own action and label while it's in focus;
 * the button runs whichever is current and reads out its label to VoiceOver.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

type Action = { label: string; run: () => void };

let current: Action | null = null;
const listeners = new Set<() => void>();
const publish = () => listeners.forEach((l) => l());

/** Called by the add button. Does nothing if no tab has claimed it. */
export function runAddAction(): void {
  current?.run();
}

/** The current tab's label for the button ("Add task", "Add idea"). */
export function useAddLabel(): string {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current?.label ?? 'Add',
  );
}

/** Makes `action` what the add button does while this screen is focused. */
export function useAddAction(label: string, action: () => void): void {
  const latest = useRef(action);
  useEffect(() => {
    latest.current = action;
  });
  useFocusEffect(
    useCallback(() => {
      const mine: Action = { label, run: () => latest.current() };
      current = mine;
      publish();
      return () => {
        if (current === mine) {
          current = null;
          publish();
        }
      };
    }, [label]),
  );
}
