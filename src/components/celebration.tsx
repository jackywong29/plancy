/**
 * Celebration visuals.
 *
 * DotBurst: a ring of accent dots bursting out of the progress card when a day
 * is finished. The accent dot is plancy's mark, so the celebration is made of
 * it rather than generic confetti.
 *
 * MilestoneSheet: the rare, bigger moment (a streak milestone, a spotless
 * month). A card springs up over a dimmed screen with the number, one line of
 * copy and a button; it also leaves on its own after a few seconds.
 *
 * With Reduce Motion on, the burst is skipped and the card simply fades in,
 * so the same information arrives without the movement.
 */
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import type { Celebration } from '@/lib/celebrate';
import { Type, useTheme } from '@/theme/theme';

import { Icon } from './ui';

const DOTS = 14;

type Big = Extract<Celebration, { kind: 'milestone' | 'month' }>;

const CelebrateContext = createContext<(moment: Big) => void>(() => {});

/**
 * Hosts the milestone card at the root, so it covers the whole screen,
 * tab bar included, whichever tab asked for it.
 */
export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [moment, setMoment] = useState<Big | null>(null);
  const close = useCallback(() => setMoment(null), []);
  return (
    <CelebrateContext value={setMoment}>
      {children}
      {moment ? <MilestoneSheet moment={moment} onClose={close} /> : null}
    </CelebrateContext>
  );
}

export function useCelebrate() {
  return use(CelebrateContext);
}

export function DotBurst({ id }: { id: number }) {
  const reduced = useReducedMotion();
  if (reduced || id === 0) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.center}>
        {Array.from({ length: DOTS }, (_, i) => (
          <BurstDot key={`${id}-${i}`} index={i} />
        ))}
      </View>
    </View>
  );
}

function BurstDot({ index }: { index: number }) {
  const theme = useTheme();
  const t = useSharedValue(0);
  const angle = (index / DOTS) * Math.PI * 2 + (index % 2 ? 0.2 : 0);
  const reach = 70 + (index % 3) * 26;
  const size = index % 3 === 0 ? 10 : 7;

  useEffect(() => {
    t.value = withDelay(index * 8, withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }));
  }, [index, t]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.6 ? 1 : 1 - (t.value - 0.6) / 0.4,
    transform: [
      { translateX: Math.cos(angle) * reach * t.value },
      { translateY: Math.sin(angle) * reach * t.value - 10 * t.value },
      { scale: 1 - 0.5 * t.value },
    ],
  }));

  return <Animated.View style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.accent }, style]} />;
}

function MilestoneSheet({ moment, onClose }: { moment: Big; onClose: () => void }) {
  const theme = useTheme();
  const reduced = useReducedMotion();

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${moment.title}. ${moment.body}`);
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [moment, onClose]);

  const big = moment.kind === 'milestone' ? String(moment.days) : moment.title.split(',')[0].toLowerCase();

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(220)} style={[StyleSheet.absoluteFill, styles.scrim]}>
      <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View
        entering={reduced ? FadeIn.duration(200) : ZoomIn.springify().damping(13).stiffness(180)}
        accessibilityViewIsModal
        style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
          <Icon name={moment.kind === 'milestone' ? 'flame.fill' : 'calendar.badge.checkmark'} size={34} color={theme.accentText} weight="semibold" />
        </View>
        <Text style={{ color: theme.ink, fontFamily: Type.display, fontSize: moment.kind === 'milestone' ? 64 : 40, marginTop: 8 }}>
          {big}
          <Text style={{ color: theme.accent }}>.</Text>
        </Text>
        <Text style={{ color: theme.ink, fontSize: Type.sectionTitle, fontWeight: '600' }}>
          {moment.kind === 'milestone' ? 'day streak' : 'spotless'}
        </Text>
        <Text style={{ color: theme.ink2, fontSize: Type.body, textAlign: 'center', marginTop: 6 }}>{moment.body}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.button, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}>
          <Text style={{ color: theme.onAccent, fontSize: Type.body, fontWeight: '600' }}>Keep going</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', left: '50%', top: '50%' },
  dot: { position: 'absolute', marginLeft: -5, marginTop: -5 },
  scrim: { backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 32, zIndex: 20 },
  card: { width: '100%', maxWidth: 340, borderRadius: 28, padding: 28, alignItems: 'center', gap: 2 },
  badge: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  button: { alignSelf: 'stretch', minHeight: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
});
