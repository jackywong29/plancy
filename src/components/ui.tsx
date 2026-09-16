/**
 * The small set of pieces every screen is built from.
 *
 * Keeping them here is what makes one colour choice repaint the whole app, and
 * what keeps tap targets at the 44pt minimum in one place instead of twelve.
 */
import * as Haptics from 'expo-haptics';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Space, Type, useTheme } from '@/theme/theme';

/** Scrolling page body. The bottom inset clears the floating tab bar. */
export function Screen({ children, bottomInset = 110 }: { children: ReactNode; bottomInset?: number }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: theme.ground }}
      contentContainerStyle={{
        paddingTop: insets.top + 6,
        paddingHorizontal: Space.gutter,
        paddingBottom: bottomInset,
      }}
      keyboardDismissMode="interactive"
      contentInsetAdjustmentBehavior="never">
      {children}
    </ScrollView>
  );
}

/** The app's one flourish: a lowercase title closed by the accent dot. */
export function BigTitle({ children, subtitle }: { children: string; subtitle?: string }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: subtitle ? 12 : 14 }}>
      <Text style={[styles.bigTitle, { color: theme.ink }]} accessibilityRole="header">
        {children}
        <Text style={{ color: theme.accent }}>.</Text>
      </Text>
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

/** The circle that fills with the accent when something is done. */
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
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      hitSlop={Math.max(0, Math.round((44 - size) / 2))}
      onPress={() => {
        Haptics.impactAsync(checked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: checked ? theme.accent : theme.ink3,
        backgroundColor: checked ? theme.accent : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {checked ? <Icon name="checkmark" size={size * 0.55} color={theme.onAccent} weight="bold" /> : null}
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
      onPress={onPress}
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
  bigTitle: { fontFamily: Type.display, fontSize: Type.title, letterSpacing: -0.5 },
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
});
