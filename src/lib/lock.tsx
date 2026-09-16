/**
 * Face ID lock.
 *
 * Two scopes, chosen in Settings: the whole app, or only Journal and Finance
 * (the private parts). The app re-locks whenever it goes to the background,
 * so handing the phone to someone with plancy open is safe. iOS falls back to
 * the passcode after failed attempts, so nobody can be locked out.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui';
import type { Settings } from '@/data/types';
import { Type, useTheme } from '@/theme/theme';

type Lock = { locked: boolean; unlock: () => Promise<void> };

const LockContext = createContext<Lock>({ locked: false, unlock: async () => {} });

export function LockProvider({ settings, children }: { settings: Settings; children: ReactNode }) {
  const [locked, setLocked] = useState(settings.lockEnabled);
  const busy = useRef(false);

  // Coming back from the background locks again; turning the lock off in
  // Settings opens everything at once.
  useEffect(() => {
    if (!settings.lockEnabled) {
      setLocked(false);
      return;
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') setLocked(true);
    });
    return () => sub.remove();
  }, [settings.lockEnabled]);

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock plancy',
        cancelLabel: 'Cancel',
      });
      if (result.success) setLocked(false);
    } finally {
      busy.current = false;
    }
  }, []);

  const value = useMemo(() => ({ locked, unlock }), [locked, unlock]);
  return <LockContext value={value}>{children}</LockContext>;
}

export function useLock(): Lock {
  return use(LockContext);
}

/**
 * Covers `children` until Face ID passes. `always` gates regardless of scope
 * (the whole-app cover); otherwise only when the scope is 'private'.
 */
export function Locked({
  settings,
  what,
  always,
  children,
}: {
  settings: Settings;
  /** Shown as "<what> is locked", e.g. "Journal". */
  what: string;
  always?: boolean;
  children: ReactNode;
}) {
  const { locked, unlock } = useLock();
  const theme = useTheme();
  const applies = settings.lockEnabled && (always ? settings.lockScope === 'app' : settings.lockScope === 'private');
  const show = applies && locked;

  // Ask straight away when the cover appears, so the usual path is one glance.
  useEffect(() => {
    if (show) void unlock();
  }, [show, unlock]);

  if (!show) return <>{children}</>;
  return (
    <View style={[styles.cover, { backgroundColor: theme.ground }]}>
      <Text style={{ color: theme.ink, fontFamily: Type.display, fontSize: 34 }}>
        {what.toLowerCase()}
        <Text style={{ color: theme.accent }}>.</Text>
      </Text>
      <Text style={{ color: theme.ink2, fontSize: Type.body, marginTop: 6 }}>Locked</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Unlock with Face ID"
        onPress={() => void unlock()}
        style={({ pressed }) => [styles.button, { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 }]}>
        <Icon name="faceid" size={20} color={theme.onAccent} weight="semibold" />
        <Text style={{ color: theme.onAccent, fontSize: Type.body, fontWeight: '600' }}>Unlock</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center', padding: 32 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
  },
});
