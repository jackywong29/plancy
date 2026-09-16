/**
 * Cash flow over the last six months: what came in against what went out,
 * month by month, with the difference as the headline. Tapping a month opens
 * it below.
 *
 * Drawn with plain views rather than a chart library: two thin bars a month
 * is simple enough, and this way it takes the theme's colours directly.
 * Colours follow the rest of Finance: green for money in, grey for money out.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { monthTotals } from '@/data/store';
import type { MoneyEntry } from '@/data/types';
import { addMonths, formatMoney, formatMonthLong, fromIso } from '@/lib/format';
import { Space, Type, useTheme } from '@/theme/theme';

import { Card } from './ui';

const MONTHS = 6;
const BAR_HEIGHT = 96;

export function CashFlow({
  money,
  month,
  currency,
  onSelect,
}: {
  money: MoneyEntry[];
  /** The month shown on the Finance screen; the chart ends there. */
  month: string;
  currency: string;
  onSelect: (month: string) => void;
}) {
  const theme = useTheme();
  const months = Array.from({ length: MONTHS }, (_, i) => addMonths(month, i - (MONTHS - 1)));
  const rows = months.map((m) => {
    const t = monthTotals(money.filter((e) => e.month === m));
    return { month: m, in: t.income, out: t.spent + t.saving, left: t.left };
  });
  const withData = rows.filter((r) => r.in > 0 || r.out > 0);
  if (withData.length < 2) return null;

  const peak = Math.max(...rows.flatMap((r) => [r.in, r.out]), 1);
  const current = rows[rows.length - 1];
  const previous = rows[rows.length - 2];
  const change = previous.in > 0 || previous.out > 0 ? current.left - previous.left : null;

  return (
    <Card style={styles.card}>
      <View style={{ gap: 2 }}>
        <Text style={{ color: theme.ink, fontSize: Type.sectionTitle, fontWeight: '600' }}>Cash flow, last {MONTHS} months</Text>
        <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>
          {formatMonthLong(current.month).split(' ')[0]}: {formatMoney(current.in, currency)} in, {formatMoney(current.out, currency)} out
          {change !== null
            ? `. ${change >= 0 ? 'Up' : 'Down'} ${formatMoney(Math.abs(change), currency)} on ${formatMonthLong(previous.month).split(' ')[0]}.`
            : '.'}
        </Text>
      </View>

      <View style={styles.plot}>
        {rows.map((r) => {
          const selected = r.month === month;
          const label = fromIso(`${r.month}-01`).toLocaleDateString(undefined, { month: 'short' });
          return (
            <Pressable
              key={r.month}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${formatMonthLong(r.month)}: in ${formatMoney(r.in, currency)}, out ${formatMoney(r.out, currency)}, left ${formatMoney(r.left, currency)}`}
              onPress={() => onSelect(r.month)}
              style={styles.column}>
              <View style={styles.bars}>
                <View style={[styles.bar, { height: Math.max(3, (r.in / peak) * BAR_HEIGHT), backgroundColor: theme.good, opacity: selected ? 1 : 0.7 }]} />
                <View style={[styles.bar, { height: Math.max(3, (r.out / peak) * BAR_HEIGHT), backgroundColor: theme.ink3, opacity: selected ? 1 : 0.7 }]} />
              </View>
              <Text style={{ color: selected ? theme.ink : theme.ink2, fontSize: Type.caption, fontWeight: selected ? '700' : '500' }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {[
          { label: 'In', colour: theme.good },
          { label: 'Out, including savings', colour: theme.ink3 },
        ].map((item) => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.colour }} />
            <Text style={{ color: theme.ink2, fontSize: Type.caption }}>{item.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: Space.gutter, gap: 14, marginTop: 12 },
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  column: { flex: 1, alignItems: 'center', gap: 6 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: BAR_HEIGHT },
  bar: { width: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  legend: { flexDirection: 'row', gap: 16 },
});
