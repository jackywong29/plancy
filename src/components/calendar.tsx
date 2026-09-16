/**
 * The calendar at the top of Today: a week strip, or the whole month with
 * arrows to move through months. A chevron under it switches between the two,
 * and the choice is remembered.
 *
 * Under each day, up to three pips show how many tasks it has and how many
 * are done, so a glance at the month tells you where the busy days are.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { addDays, addMonths, formatDayLong, formatMonthLong, isoMonth, monthGrid, weekOf, weekdayInitials } from '@/lib/format';
import { Type, useTheme } from '@/theme/theme';

import { Icon } from './ui';

type Counts = Map<string, { total: number; done: number }>;

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

  const cell = (iso: string | null, i: number) => {
    if (!iso) return <View key={`blank-${i}`} style={styles.day} />;
    const count = counts.get(iso);
    const selected = iso === day;
    const isToday = iso === today;
    return (
      <Pressable
        key={iso}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${formatDayLong(iso)}${count ? `, ${count.done} of ${count.total} done` : ''}`}
        onPress={() => onSelect(iso)}
        style={styles.day}>
        <View style={[styles.dayNumber, selected && { backgroundColor: theme.accent }]}>
          <Text
            style={{
              color: selected ? theme.onAccent : isToday ? theme.accentText : theme.ink,
              fontSize: 17,
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

  const weeks: (string | null)[][] = [];
  if (mode === 'month') {
    const cells = monthGrid(month, weekStart);
    while (cells.length % 7) cells.push(null);
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  }

  return (
    <View>
      {mode === 'month' ? (
        <View style={styles.monthBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => onMonth(addMonths(month, -1))} style={styles.arrow}>
            <Icon name="chevron.left" size={18} color={theme.accentText} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${formatMonthLong(month)}, tap for today`}
            onPress={() => {
              onMonth(isoMonth(today));
              onSelect(today);
            }}>
            <Text style={{ color: theme.ink, fontSize: Type.callout, fontWeight: '600' }}>{formatMonthLong(month)}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => onMonth(addMonths(month, 1))} style={styles.arrow}>
            <Icon name="chevron.right" size={18} color={theme.accentText} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.week}>
        {initials.map((letter, i) => (
          <Text key={i} style={[styles.initial, { color: theme.ink3 }]}>
            {letter}
          </Text>
        ))}
      </View>

      {mode === 'week' ? (
        <View style={styles.week}>{weekOf(day, weekStart).map(cell)}</View>
      ) : (
        weeks.map((week, w) => (
          <View key={w} style={styles.week}>
            {week.map(cell)}
          </View>
        ))
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={mode === 'week' ? 'Show the whole month' : 'Show one week'}
        hitSlop={8}
        onPress={() => {
          if (mode === 'week') onMonth(isoMonth(day));
          else if (isoMonth(day) !== month) onSelect(addDays(`${month}-01`, 0));
          onMode(mode === 'week' ? 'month' : 'week');
        }}
        style={styles.toggle}>
        <Icon name={mode === 'week' ? 'chevron.down' : 'chevron.up'} size={14} color={theme.ink3} weight="semibold" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -4 },
  initial: { flex: 1, textAlign: 'center', fontSize: Type.caption, marginBottom: 2 },
  day: { alignItems: 'center', gap: 3, paddingVertical: 2, flex: 1 },
  dayNumber: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  pips: { flexDirection: 'row', gap: 3, height: 5 },
  pip: { width: 5, height: 5, borderRadius: 2.5 },
  toggle: { alignItems: 'center', paddingVertical: 6, marginTop: 2 },
});
