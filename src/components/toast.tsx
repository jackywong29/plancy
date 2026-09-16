/**
 * A short message at the bottom of the screen, with one optional action.
 *
 * Used for undo: iOS deletes on a swipe without asking, so the way back is a
 * toast that stays for a few seconds rather than a confirmation beforehand.
 */
import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { Type, useTheme } from '@/theme/theme';

type ToastAction = { label: string; onPress: () => void };
type Toast = { id: number; message: string; action?: ToastAction };

const ToastContext = createContext<(message: string, action?: ToastAction) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, action?: ToastAction) => {
    if (timer.current) clearTimeout(timer.current);
    const id = Date.now();
    setToast({ id, message, action });
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), action ? 5000 : 2500);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext value={value}>
      {children}
      {toast ? <ToastView toast={toast} onDone={() => setToast(null)} /> : null}
    </ToastContext>
  );
}

function ToastView({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const theme = useTheme();
  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <Animated.View
        entering={FadeInDown.duration(220)}
        exiting={FadeOutDown.duration(180)}
        accessibilityLiveRegion="polite"
        style={[styles.toast, { backgroundColor: theme.ink }]}>
        <Text style={{ color: theme.ground, fontSize: Type.callout, fontWeight: '500', flexShrink: 1 }}>
          {toast.message}
        </Text>
        {toast.action ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => {
              toast.action?.onPress();
              onDone();
            }}>
            <Text style={{ color: theme.accent, fontSize: Type.callout, fontWeight: '700' }}>{toast.action.label}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

export function useToast() {
  return use(ToastContext);
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, bottom: 108, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    maxWidth: '88%',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
});
