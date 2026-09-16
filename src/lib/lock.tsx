/**
 * Face ID lock.
 *
 * Two scopes, chosen in Settings: the whole app, or only Journal and Finance.
 * The rules, which are what make it feel solid rather than surprising:
 *
 * - Turning the lock on, or switching scope, takes effect at once: choose
 *   "Whole app" and the lock screen appears straight away; choose "Journal and
 *   Finance" and those two tabs are locked the next time you look at them.
 * - One successful Face ID opens everything until plancy leaves the screen.
 *   Going to the background locks again.
 * - Weakening the lock (turning it off, or from whole app to two tabs) needs
 *   Face ID if you haven't passed it this session, so an unlocked phone left
 *   on a table can't simply switch it off.
 * - While plancy is in the app switcher, a cover hides its contents.
 * - iOS falls back to the passcode after failed attempts, and the lock can't
 *   be turned on at all without a passcode, so nobody gets locked out.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import { useFocusEffect } from 'expo-router';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text, View, type AppStateStatus } from 'react-native';
import Animated, { Easing, FadeIn, Keyframe, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/ui';
import type { Settings } from '@/data/types';
import { haptic } from '@/lib/haptics';
import { Type, useTheme } from '@/theme/theme';

type Scope = Settings['lockScope'];

type Lock = {
  /** The whole app is behind the lock screen. */
  appLocked: boolean;
  /** Journal and Finance are behind their lock screen. */
  privateLocked: boolean;
  /** "Face ID", "Touch ID", "Optic ID" or "Passcode". */
  method: string;
  /** Bumps each time plancy comes back from the background. */
  resumes: number;
  /** Bumps each time the lock closes again, so each locking asks once. */
  episode: number;
  /** plancy is on screen (Face ID can only be asked for then). */
  active: boolean;
  unlock: () => Promise<boolean>;
  /** Settings calls these instead of writing the setting directly. */
  setEnabled: (on: boolean) => Promise<void>;
  setScope: (scope: Scope) => Promise<void>;
};

const LockContext = createContext<Lock | null>(null);

export function LockProvider({
  settings,
  setSetting,
  children,
}: {
  settings: Settings;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  children: ReactNode;
}) {
  const { lockEnabled: enabled, lockScope: scope } = settings;
  // Unlocked for this session. Starts false so a cold launch always asks.
  const [unlocked, setUnlocked] = useState(false);
  const [state, setState] = useState<AppStateStatus>(AppState.currentState);
  const [resumes, setResumes] = useState(0);
  const [episode, setEpisode] = useState(0);
  const [method, setMethod] = useState('Face ID');
  const authenticating = useRef(false);
  // Face ID's own sheet makes plancy briefly inactive. That must not bring up
  // the app-switcher cover, including the moment after Face ID succeeds and
  // before plancy is active again.
  const inactiveForAuth = useRef(false);

  useEffect(() => {
    void LocalAuthentication.supportedAuthenticationTypesAsync().then((types) => {
      const T = LocalAuthentication.AuthenticationType;
      setMethod(
        types.includes(T.FACIAL_RECOGNITION) ? 'Face ID' : types.includes(T.FINGERPRINT) ? 'Touch ID' : types.includes(T.IRIS) ? 'Optic ID' : 'Passcode',
      );
    });
  }, []);

  const relock = useCallback(() => {
    setUnlocked(false);
    setEpisode((n) => n + 1);
  }, []);

  useEffect(() => {
    let last = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'inactive' && authenticating.current) inactiveForAuth.current = true;
      if (next !== 'inactive') inactiveForAuth.current = false;
      if (next === 'background') relock();
      if (next === 'active' && last === 'background') setResumes((n) => n + 1);
      last = next;
      setState(next);
    });
    return () => sub.remove();
  }, [relock]);

  const unlock = useCallback(async () => {
    if (authenticating.current) return false;
    authenticating.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock plancy', cancelLabel: 'Cancel' });
      if (result.success) {
        haptic('unlocked');
        setUnlocked(true);
        return true;
      }
      // Cancelling is a choice, not a failure; only a refusal buzzes.
      if (result.error === 'authentication_failed' || result.error === 'lockout') haptic('refused');
      return false;
    } finally {
      authenticating.current = false;
    }
  }, []);

  const setEnabled = useCallback(
    async (on: boolean) => {
      if (on) {
        const level = await LocalAuthentication.getEnrolledLevelAsync();
        if (level === LocalAuthentication.SecurityLevel.NONE) {
          Alert.alert('Set a passcode first', 'plancy uses your iPhone passcode or Face ID to lock. Add one in Settings → Face ID & Passcode.');
          return;
        }
        // Takes effect at once: the chosen part locks now.
        relock();
        setSetting('lockEnabled', true);
        return;
      }
      if (!unlocked && !(await unlock())) return;
      setSetting('lockEnabled', false);
    },
    [relock, setSetting, unlock, unlocked],
  );

  const setScope = useCallback(
    async (next: Scope) => {
      if (next === scope) return;
      if (!enabled) {
        setSetting('lockScope', next);
        return;
      }
      if (next === 'private') {
        // Weaker than the whole app. You are inside the unlocked app already,
        // so no prompt; Journal and Finance lock at once.
        setSetting('lockScope', 'private');
        relock();
        return;
      }
      // Stronger: the whole app locks straight away.
      setSetting('lockScope', 'app');
      relock();
    },
    [enabled, scope, setSetting, relock],
  );

  const value = useMemo<Lock>(
    () => ({
      appLocked: enabled && scope === 'app' && !unlocked,
      privateLocked: enabled && scope === 'private' && !unlocked,
      method,
      resumes,
      episode,
      active: state === 'active',
      unlock,
      setEnabled,
      setScope,
    }),
    [enabled, scope, unlocked, method, resumes, episode, state, unlock, setEnabled, setScope],
  );

  // Hide the contents in the app switcher. Not while Face ID itself is on
  // screen, which also makes the app briefly inactive.
  const hide = enabled && state !== 'active' && !authenticating.current && !inactiveForAuth.current;

  return (
    <LockContext value={value}>
      {children}
      {hide ? <PrivacyCover /> : null}
    </LockContext>
  );
}

export function useLock(): Lock {
  const lock = use(LockContext);
  if (!lock) throw new Error('useLock must be used inside LockProvider');
  return lock;
}

/** Covers the whole app while it is locked with the "Whole app" scope. */
export function AppLock({ children }: { children: ReactNode }) {
  const lock = useLock();
  const asked = useRef(-1);

  // Ask once per locking (launch, each return from the background, turning
  // the lock on), and only while plancy is on screen.
  const { appLocked, active, episode, unlock } = lock;
  useEffect(() => {
    if (!appLocked || !active || asked.current === episode) return;
    asked.current = episode;
    void unlock();
  }, [appLocked, active, episode, unlock]);

  return (
    <View style={{ flex: 1 }}>
      {lock.appLocked ? null : children}
      {lock.appLocked ? <LockScreen title="plancy" message="plancy is locked" full /> : null}
    </View>
  );
}

/**
 * Covers one private tab (Journal, Finance) while it is locked.
 *
 * The tab stays mounted underneath the cover. The native tab bar gives its
 * top spacing to the first scroll view it finds when the tab loads, so if the
 * lock screen were drawn instead, the tab would come up under the status bar
 * once unlocked. Hidden from VoiceOver while covered. On unlock the cover
 * fades up and away while the tab settles in from a hair smaller.
 */
export function PrivateLock({ title, children }: { title: string; children: ReactNode }) {
  const lock = useLock();
  const { privateLocked, active, resumes, unlock } = lock;
  const reveal = useSharedValue(privateLocked ? 0 : 1);

  useFocusEffect(
    useCallback(() => {
      if (privateLocked && active) void unlock();
    }, [privateLocked, active, resumes, unlock]),
  );

  useEffect(() => {
    reveal.value = privateLocked ? 0 : withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [privateLocked, reveal]);

  const settle = useAnimatedStyle(() => ({
    opacity: 0.4 + 0.6 * reveal.value,
    transform: [{ scale: 0.97 + 0.03 * reveal.value }],
  }));

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={[{ flex: 1 }, settle]}
        accessibilityElementsHidden={privateLocked}
        importantForAccessibility={privateLocked ? 'no-hide-descendants' : 'auto'}>
        {children}
      </Animated.View>
      {privateLocked ? <LockScreen title={title} message={`${title[0].toUpperCase()}${title.slice(1)} is locked`} full /> : null}
    </View>
  );
}

function LockScreen({ title, message }: { title: string; message: string; full?: boolean }) {
  const theme = useTheme();
  const lock = useLock();
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={LIFT_AWAY}
      style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: theme.ground }]}>
      <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
        <Icon name="lock.fill" size={30} color={theme.accentText} weight="semibold" />
      </View>
      <Text style={{ color: theme.ink, fontFamily: Type.display, fontSize: 34, marginTop: 20 }} accessibilityRole="header">
        {title.toLowerCase()}
        <Text style={{ color: theme.accent }}>.</Text>
      </Text>
      <Text style={{ color: theme.ink2, fontSize: Type.body, marginTop: 4 }}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Unlock with ${lock.method}`}
        onPress={() => void lock.unlock()}
        style={({ pressed }) => [styles.button, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}>
        <Icon name={lock.method === 'Touch ID' ? 'touchid' : lock.method === 'Passcode' ? 'lock.open.fill' : 'faceid'} size={20} color={theme.onAccent} weight="semibold" />
        <Text style={{ color: theme.onAccent, fontSize: Type.body, fontWeight: '600' }}>Unlock with {lock.method}</Text>
      </Pressable>
    </Animated.View>
  );
}

/** The cover's exit: a slight lift and fade, as the content underneath settles. */
const LIFT_AWAY = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  100: { opacity: 0, transform: [{ scale: 1.04 }], easing: Easing.out(Easing.cubic) },
}).duration(300);

/** What the app switcher shows while the lock is on. */
function PrivacyCover() {
  const theme = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: theme.ground }]} accessibilityElementsHidden>
      <Text style={{ color: theme.ink, fontFamily: Type.display, fontSize: 40 }}>
        plancy<Text style={{ color: theme.accent }}>.</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { alignItems: 'center', justifyContent: 'center', padding: 32, zIndex: 10 },
  badge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  button: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28, minHeight: 50, paddingHorizontal: 24, borderRadius: 25 },
});
