/**
 * The small set of pieces every screen is built from.
 *
 * Keeping them here is what makes one colour choice repaint the whole app, and
 * what keeps tap targets at the 44pt minimum in one place instead of twelve.
 */
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';

import { Space, Type, useTheme } from '@/theme/theme';

/** Scrolling page body. The bottom inset clears the floating tab bar. */
export function Screen({ children, bottomInset = Space.tabBar }: { children: ReactNode; bottomInset?: number }) {
  const theme = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: theme.ground }}
      contentContainerStyle={{
        paddingTop: 4,
        paddingHorizontal: Space.gutter,
        paddingBottom: bottomInset,
      }}
      keyboardDismissMode="interactive"
      contentInsetAdjustmentBehavior="never">
      {children}
    </ScrollView>
  );
}

/**
 * The app's one flourish: a lowercase title closed by the accent dot.
 * Screen actions sit on the title line, the way iOS puts bar buttons beside a
 * large title, so no row above it is ever empty.
 */
export function BigTitle({
  children,
  subtitle,
  actions,
}: {
  children: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={styles.titleRow}>
        {/* The title is the one piece of pure branding in the app, and at the
            largest accessibility sizes an uncapped 38pt Futura is wider than
            the screen and breaks mid-word ("financ / e."). It still grows —
            just not past the point where it stops being a word. Everything
            that carries meaning scales without a cap. */}
        <Text
          style={[styles.bigTitle, { color: theme.ink }]}
          maxFontSizeMultiplier={1.6}
          accessibilityRole="header">
          {children}
          <Text style={{ color: theme.accent }}>.</Text>
        </Text>
        {actions ? <View style={styles.titleActions}>{actions}</View> : null}
      </View>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.ink2 }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionHead({ title, trailing }: { title: string; trailing?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHead}>
      <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>{title}</Text>
      {trailing ? <Text style={{ color: theme.ink, fontSize: Type.callout, fontWeight: '600' }}>{trailing}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.card }, style]}>{children}</View>;
}

/** A row in a grouped card, with the hairline iOS draws between rows. */
export function Row({
  children,
  first,
  onPress,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  first?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const body = (
    <View
      style={[
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
        style,
      ]}>
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}>
      {body}
    </Pressable>
  );
}

/**
 * The circle that fills with the accent when something is done. Ticking it
 * gives a small spring pop; the haptic belongs to whoever handles `onPress`,
 * since only they know whether this tick finished the whole day.
 */
export function Tick({
  checked,
  onPress,
  label,
  size = 28,
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
  size?: number;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // Pop only when it becomes checked, not when a list first draws. Reduce
  // Motion is honoured by Reanimated's defaults (the spring is skipped).
  const wasChecked = useSharedValue(checked);
  useEffect(() => {
    if (checked && !wasChecked.value) {
      scale.value = withSequence(withTiming(0.82, { duration: 90 }), withSpring(1, { damping: 9, stiffness: 260 }));
    }
    wasChecked.value = checked;
  }, [checked, scale, wasChecked]);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      hitSlop={Math.max(0, Math.round((44 - size) / 2))}
      onPress={onPress}>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: checked ? theme.accent : theme.ink3,
            backgroundColor: checked ? theme.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          },
          pop,
        ]}>
        {checked ? <Icon name="checkmark" size={size * 0.55} color={theme.onAccent} weight="bold" /> : null}
      </Animated.View>
    </Pressable>
  );
}

export function Icon({
  name,
  size = 20,
  color,
  weight = 'regular',
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color: string;
  weight?: SymbolViewProps['weight'];
}) {
  return (
    <SymbolView name={name} size={size} tintColor={color} weight={weight} resizeMode="scaleAspectFit" />
  );
}

/** Round button in a screen's top corner. 44pt, per Apple's minimum. */
export function RoundButton({
  icon,
  label,
  onPress,
  accent,
}: {
  icon: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
  accent?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roundButton,
        { backgroundColor: accent ? theme.accent : theme.card, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Icon name={icon} size={20} color={accent ? theme.onAccent : theme.ink} weight={accent ? 'semibold' : 'regular'} />
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      // The pill is about 34pt tall, so the slop carries it to Apple's 44.
      hitSlop={{ top: 5, bottom: 5 }}
      onPress={() => {
        if (!selected) haptic('select');
        onPress();
      }}
      style={[
        styles.chip,
        { backgroundColor: selected ? theme.accent : theme.card },
      ]}>
      <Text style={{ color: selected ? theme.onAccent : theme.ink, fontSize: Type.callout, fontWeight: '500' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const FAB = 56;

/**
 * How far a screen's content must clear the bottom when a Fab floats over it,
 * so the last row can always be scrolled out from under the button.
 */
export const FAB_CLEARANCE = Space.tabBarHeight + Space.gap + FAB + Space.gap;

/**
 * The one button a screen is really about, parked in the bottom corner above
 * the tab bar — where Mail keeps Compose, and within reach of a thumb. Screens
 * that use it pass `bottomInset={FAB_CLEARANCE}` to `Screen`.
 */
export function Fab({
  icon,
  label,
  onPress,
}: {
  icon: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: theme.accent,
          shadowColor: '#000000',
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}>
      <Icon name={icon} size={24} color={theme.onAccent} weight="semibold" />
    </Pressable>
  );
}

/**
 * True when the reader has chosen one of iOS's accessibility text sizes.
 *
 * `fontScale` passes 1.35 at the first of them, and layouts that put things
 * side by side have to become layouts that stack. Using the real scale rather
 * than a screen-width guess means it follows the setting, not the device.
 */
export function useAccessibilitySize(): boolean {
  return useWindowDimensions().fontScale >= 1.35;
}

/**
 * A row of exclusive choices, which becomes a column of them once the text is
 * large enough that a row would have to hyphenate ("Syst / em", "Ligh / t").
 * Every screen that offered a choice had its own copy of this; they are all
 * this one now, so the reflow only had to be written once.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  const theme = useTheme();
  const stacked = useAccessibilitySize();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.segment, { backgroundColor: theme.fill }, stacked && styles.segmentStacked]}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, checked: on }}
            accessibilityLabel={o.label}
            onPress={() => {
              if (!on) haptic('select');
              onChange(o.value);
            }}
            style={[
              styles.segmentItem,
              stacked && styles.segmentItemStacked,
              on && { backgroundColor: theme.card },
            ]}>
            <Text style={{ color: theme.ink, fontSize: Type.callout, fontWeight: on ? '600' : '500' }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Never leave a screen blank: say what it holds and how to start it. */
export function Empty({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <Card style={{ paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center' }}>
      <Text style={{ color: theme.ink, fontSize: Type.sectionTitle, fontWeight: '600', marginBottom: 4 }}>
        {title}
      </Text>
      <Text style={{ color: theme.ink2, fontSize: Type.callout, textAlign: 'center' }}>{body}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 },
  titleActions: { flexDirection: 'row', gap: 10 },
  bigTitle: { fontFamily: Type.display, fontSize: Type.title, letterSpacing: -0.5, flexShrink: 1 },
  subtitle: { fontSize: Type.callout, marginTop: 2 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 22,
    marginBottom: 7,
    marginHorizontal: 4,
  },
  card: { borderRadius: Space.radius, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.gap,
    minHeight: Space.row,
    paddingVertical: 10,
    paddingHorizontal: Space.gutter,
  },
  roundButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  segment: { flexDirection: 'row', borderRadius: 11, padding: 3 },
  segmentStacked: { flexDirection: 'column' },
  segmentItem: { flex: 1, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 9, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  segmentItemStacked: { flex: 0, alignItems: 'flex-start', paddingHorizontal: 12 },
  fab: {
    position: 'absolute',
    right: Space.gutter,
    bottom: Space.tabBarHeight + Space.gap,
    width: FAB,
    height: FAB,
    borderRadius: FAB / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});
