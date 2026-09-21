/**
 * The calendar at the top of Today: a week strip, or the whole month.
 *
 * Expanding unfolds the month out of the week you're on: that week's row
 * stays put and glides to its place in the month while the other rows fade in
 * around it, and collapsing folds them back into it. Swipe sideways, or use
 * the arrows, to move a week or a month; the new one slides in from the side
 * you're heading. Every row is a full week, with the neighbouring month's days
 * dimmed, so a row looks the same in both views.
 *
 * Under each day, up to three pips show how many tasks it has and how many
 * are done. A day where everything got done keeps a soft accent circle: a
 * month of those is its own quiet reward.
 *
 * Reanimated skips these animations when Reduce Motion is on.
 */
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';
import { addDays, addMonths, formatDayLong, formatMonthLong, isoMonth, weekOf, weekdayInitials } from '@/lib/format';
import { Type, useTheme } from '@/theme/theme';

import { Icon } from './ui';

type Counts = Map<string, { total: number; done: number }>;

const GLIDE = LinearTransition.duration(280);

/** Every full week that touches `month`. */
function monthWeeks(month: string, weekStart: 1 | 7): string[][] {
  const weeks: string[][] = [];
  let week = weekOf(`${month}-01`, weekStart);
  while (isoMonth(week[0]) <= month) {
    weeks.push(week);
    week = weekOf(addDays(week[6], 1), weekStart);
  }
  return weeks;
}

export function Calendar({
  day,
  today,
  month,
  mode,
  weekStart,
  counts,
  onSelect,
  onMonth,
  onMode,
}: {
  day: string;
  today: string;
  /** YYYY-MM shown in month mode. */
  month: string;
  mode: 'week' | 'month';
  weekStart: 1 | 7;
  counts: Counts;
  onSelect: (iso: string) => void;
  onMonth: (month: string) => void;
  onMode: (mode: 'week' | 'month') => void;
}) {
  const theme = useTheme();
  const initials = weekdayInitials(weekStart);
  // Which way the last move went, so the next rows slide in from that side.
  const [heading, setHeading] = useState<'back' | 'forward' | null>(null);
  const expanded = mode === 'month';

  const weeks = expanded ? monthWeeks(month, weekStart) : [weekOf(day, weekStart)];

  function step(delta: 1 | -1) {
    haptic('select');
    setHeading(delta > 0 ? 'forward' : 'back');
    if (expanded) onMonth(addMonths(month, delta));
    else onSelect(addDays(day, 7 * delta));
  }

  function pick(iso: string) {
    if (iso === day) return;
    haptic('select');
    setHeading(null);
    if (expanded && isoMonth(iso) !== month) setHeading(iso > day ? 'forward' : 'back');
    onSelect(iso);
  }

  function toggle() {
    haptic('select');
    setHeading(null);
    if (expanded && isoMonth(day) !== month) onSelect(`${month}-01`);
    if (!expanded) onMonth(isoMonth(day));
    onMode(expanded ? 'week' : 'month');
  }

  // Sideways swipes move; anything mostly vertical is left to the page scroll.
  const stepRef = useRef(step);
  stepRef.current = step;
  const swipe = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-14, 14])
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX < -48 || e.velocityX < -600) stepRef.current(1);
      else if (e.translationX > 48 || e.velocityX > 600) stepRef.current(-1);
    });

  const chevron = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(expanded ? '180deg' : '0deg', { duration: 280 }) }],
  }));

  const entering = heading === 'forward' ? FadeInRight.duration(260) : heading === 'back' ? FadeInLeft.duration(260) : FadeIn.duration(220).delay(60);

  const cell = (iso: string) => {
    const count = counts.get(iso);
    const selected = iso === day;
    const isToday = iso === today;
    const outside = expanded && isoMonth(iso) !== month;
    const allDone = !!count && count.total > 0 && count.done === count.total;
    return (
      <Pressable
        key={iso}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${formatDayLong(iso)}${count ? `, ${count.done} of ${count.total} done` : ''}`}
        onPress={() => pick(iso)}
        style={[styles.day, outside && { opacity: 0.4 }]}>
        <View
          style={[
            styles.dayNumber,
            allDone && !selected && { backgroundColor: theme.accentSoft },
            selected && { backgroundColor: theme.accent },
          ]}>
          <Text
            // Seven columns of two digits cannot widen much past a third
            // again without the grid stopping being a grid, so the number
            // grows to there and stops. Nothing is lost: the row's
            // accessibility label reads the whole date, uncapped.
            maxFontSizeMultiplier={1.35}
            style={{
              color: selected ? theme.onAccent : isToday ? theme.accentText : theme.ink,
              fontSize: Type.body,
              fontWeight: selected || isToday ? '700' : '500',
            }}>
            {Number(iso.slice(8))}
          </Text>
        </View>
        <View style={styles.pips}>
          {Array.from({ length: Math.min(count?.total ?? 0, 3) }, (_, p) => (
            <View key={p} style={[styles.pip, { backgroundColor: p < (count?.done ?? 0) ? theme.accent : theme.ink3 }]} />
          ))}
        </View>
      </Pressable>
    );
  };

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View layout={GLIDE}>
        <LayoutAnimationConfig skipEntering skipExiting>
          {expanded ? (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)} layout={GLIDE} style={styles.monthBar}>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => step(-1)} style={styles.arrow}>
                <Icon name="chevron.left" size={18} color={theme.accentText} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${formatMonthLong(month)}, tap to go to today`}
                onPress={() => {
                  haptic('select');
                  setHeading(null);
                  onMonth(isoMonth(today));
                  onSelect(today);
                }}>
                <Animated.Text key={month} entering={FadeIn.duration(200)} style={{ color: theme.ink, fontSize: Type.callout, fontWeight: '600' }}>
                  {formatMonthLong(month)}
                </Animated.Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => step(1)} style={styles.arrow}>
                <Icon name="chevron.right" size={18} color={theme.accentText} />
              </Pressable>
            </Animated.View>
          ) : null}

          <Animated.View layout={GLIDE} style={styles.week}>
            {initials.map((letter, i) => (
              <Text key={i} maxFontSizeMultiplier={1.35} style={[styles.initial, { color: theme.ink3 }]}>
                {letter}
              </Text>
            ))}
          </Animated.View>

          {weeks.map((week) => (
            <Animated.View
              // Keyed by the week's first day, so the week you're on is the same
              // row in both views and glides instead of redrawing.
              key={week[0]}
              entering={entering}
              exiting={FadeOut.duration(140)}
              layout={GLIDE}
              style={styles.week}>
              {week.map(cell)}
            </Animated.View>
          ))}
        </LayoutAnimationConfig>

        <Animated.View layout={GLIDE}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Show one week' : 'Show the whole month'}
            hitSlop={10}
            onPress={toggle}
            style={styles.toggle}>
            <Animated.View style={chevron}>
              <Icon name="chevron.down" size={14} color={theme.ink3} weight="semibold" />
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -4 },
  initial: { flex: 1, textAlign: 'center', fontSize: Type.caption, marginBottom: 2 },
  // The circle grows with the capped number instead of clipping it.
  day: { alignItems: 'center', gap: 3, paddingVertical: 2, flex: 1 },
  dayNumber: { minWidth: 38, minHeight: 38, borderRadius: 19, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  pips: { flexDirection: 'row', gap: 3, height: 5 },
  pip: { width: 5, height: 5, borderRadius: 2.5 },
  toggle: { alignItems: 'center', paddingVertical: 6, marginTop: 2 },
});
