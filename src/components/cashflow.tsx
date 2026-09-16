/**
 * Cash flow: what was left each month over the last six.
 *
 * One series, in the accent. An earlier version drew money in and money out
 * as two colours, but with an accent the person picks there is no second
 * colour that stays distinguishable for every choice and for colour-blind
 * readers (the palette validator failed every pairing). So the chart shows
 * the single number that answers "how did the month go", and in and out ride
 * alongside as labelled figures.
 *
 * - Bars grow from a zero line; an overspent month drops below it, so the sign
 *   reads from position, not colour.
 * - Bars use the accent's text-safe shade, which always clears 3:1 on the card.
 * - The selected month is full strength with its figures above the plot; the
 *   rest recede. Tap a month to select it (Finance follows).
 * - Three stat tiles underneath: average in, average out, share saved.
 * - Bars grow in when the chart appears or its data changes; Reduce Motion
 *   draws them at their final height.
 * - Shown as soon as there is one month of entries.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { monthTotals } from '@/data/store';
import type { MoneyEntry } from '@/data/types';
import { haptic } from '@/lib/haptics';
import { addMonths, formatMoney, formatMonthLong, fromIso, minorUnits } from '@/lib/format';
import { Space, Type, useTheme } from '@/theme/theme';

import { Card, Icon } from './ui';

const MONTHS = 6;
const PLOT = 116;
const BAR = 18;

type MonthRow = { month: string; income: number; out: number; saving: number; left: number; hasData: boolean };

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
  const rows: MonthRow[] = Array.from({ length: MONTHS }, (_, i) => {
    const m = addMonths(month, i - (MONTHS - 1));
    const entries = money.filter((e) => e.month === m);
    const t = monthTotals(entries);
    return { month: m, income: t.income, out: t.spent + t.saving, saving: t.saving, left: t.left, hasData: entries.length > 0 };
  });
  const withData = rows.filter((r) => r.hasData);
  if (withData.length === 0) return null;

  const current = rows[rows.length - 1];
  const previous = rows[rows.length - 2];
  const change = previous.hasData ? current.left - previous.left : null;

  // A zero line with room above for the best month and below for the worst.
  const top = Math.max(0, ...rows.map((r) => r.left));
  const bottom = Math.min(0, ...rows.map((r) => r.left));
  const span = top - bottom || 1;
  const zeroY = (top / span) * PLOT;
  const gridValue = niceCeil(top);

  const avg = (pick: (r: MonthRow) => number) => Math.round(withData.reduce((a, r) => a + pick(r), 0) / withData.length);
  const totalIn = withData.reduce((a, r) => a + r.income, 0);
  const savedShare = totalIn > 0 ? Math.round((withData.reduce((a, r) => a + r.saving, 0) / totalIn) * 100) : null;
  const shortMonth = (m: string) => fromIso(`${m}-01`).toLocaleDateString(undefined, { month: 'short' });

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Text style={{ color: theme.ink, fontSize: Type.sectionTitle, fontWeight: '600' }} accessibilityRole="header">
          Cash flow
        </Text>
        <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>Left each month</Text>
      </View>

      {/* The month's own total is the big number in the card above, so the
          chart leads with how it compares instead of repeating it. */}
      {change !== null ? (
        <View style={styles.delta} accessible>
          <Icon name={change >= 0 ? 'arrow.up.right' : 'arrow.down.right'} size={12} color={change >= 0 ? theme.good : theme.bad} weight="bold" />
          <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>
            <Text style={{ color: change >= 0 ? theme.good : theme.bad, fontWeight: '600' }}>{formatMoney(Math.abs(change), currency)}</Text>{' '}
            {change >= 0 ? 'more' : 'less'} left than in {formatMonthLong(previous.month).split(' ')[0]}
          </Text>
        </View>
      ) : null}

      <View style={styles.plotWrap}>
        {/* Recessive guides: one gridline at a round value, and the zero line. */}
        {gridValue > 0 ? (
          <View style={[styles.grid, { top: zeroY - (gridValue / span) * PLOT, borderColor: theme.line }]}>
            <Text style={[styles.gridLabel, { color: theme.ink3 }]}>{compact(gridValue, currency)}</Text>
          </View>
        ) : null}
        <View style={[styles.zero, { top: zeroY, backgroundColor: theme.ink3 }]} />

        <View style={styles.plot}>
          {rows.map((r, i) => {
            const selected = r.month === month;
            return (
              <Pressable
                key={r.month}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={
                  r.hasData
                    ? `${formatMonthLong(r.month)}: ${formatMoney(r.income, currency)} in, ${formatMoney(r.out, currency)} out, ${formatMoney(r.left, currency)} left`
                    : `${formatMonthLong(r.month)}: nothing logged`
                }
                onPress={() => {
                  if (selected) return;
                  haptic('select');
                  onSelect(r.month);
                }}
                style={styles.column}>
                <View style={{ height: PLOT, width: '100%', alignItems: 'center' }}>
                  {r.hasData ? (
                    <Bar
                      index={i}
                      value={r.left}
                      span={span}
                      zeroY={zeroY}
                      colour={theme.accentText}
                      faded={!selected}
                    />
                  ) : (
                    <View style={[styles.stub, { top: zeroY - 1, backgroundColor: theme.fill }]} />
                  )}
                </View>
                <Text style={{ color: selected ? theme.ink : theme.ink3, fontSize: Type.caption, fontWeight: selected ? '700' : '500', marginTop: 6 }}>
                  {shortMonth(r.month)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.tiles, { borderTopColor: theme.line }]}>
        <Stat label="Avg in" value={formatMoney(avg((r) => r.income), currency)} />
        <Stat label="Avg out" value={formatMoney(avg((r) => r.out), currency)} />
        <Stat label="Saved" value={savedShare === null ? '–' : `${savedShare}%`} hint="of what came in" />
      </View>
    </Card>
  );
}

function Bar({ index, value, span, zeroY, colour, faded }: { index: number; value: number; span: number; zeroY: number; colour: string; faded: boolean }) {
  const height = Math.max(3, (Math.abs(value) / span) * PLOT);
  const grow = useSharedValue(0);

  useEffect(() => {
    grow.value = 0;
    grow.value = withDelay(index * 45, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
  }, [grow, index, value, span]);

  const style = useAnimatedStyle(() => ({
    height: height * grow.value,
    opacity: withTiming(faded ? 0.38 : 1, { duration: 200 }),
  }));

  // Positive bars stand on the zero line with a rounded top; negative ones
  // hang from it with a rounded bottom. The end at the line stays square.
  const positive = value >= 0;
  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: colour },
        positive
          ? { bottom: PLOT - zeroY, borderTopLeftRadius: 4, borderTopRightRadius: 4 }
          : { top: zeroY, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
        style,
      ]}
    />
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${label}${hint ? ` ${hint}` : ''}: ${value}`}>
      <Text style={{ color: theme.ink2, fontSize: Type.caption }}>{label}</Text>
      <Text style={{ color: theme.ink, fontSize: Type.callout, fontWeight: '600' }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

/** A tidy axis value: 1, 2, 2.5 or 5 times a power of ten, in whole units. */
function niceCeil(minor: number): number {
  if (minor <= 0) return 0;
  const steps = [1, 2, 2.5, 5, 10];
  const magnitude = Math.pow(10, Math.floor(Math.log10(minor)));
  const step = steps.find((s) => s * magnitude >= minor) ?? 10;
  return step * magnitude;
}

/** "10k", "2.5k", "1.2M" for the gridline label. */
function compact(minor: number, currency: string): string {
  const units = minor / minorUnits(currency);
  if (units >= 1_000_000) return `${+(units / 1_000_000).toFixed(1)}M`;
  if (units >= 1_000) return `${+(units / 1_000).toFixed(1)}k`;
  return String(Math.round(units));
}

const styles = StyleSheet.create({
  card: { padding: Space.gutter, gap: 14, marginTop: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -6 },
  plotWrap: { position: 'relative', marginTop: 4 },
  grid: { position: 'absolute', left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'flex-end' },
  gridLabel: { fontSize: 10, marginTop: 2 },
  zero: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  plot: { flexDirection: 'row' },
  column: { flex: 1, alignItems: 'center' },
  bar: { position: 'absolute', width: BAR },
  stub: { position: 'absolute', width: BAR, height: 2, borderRadius: 1 },
  tiles: { flexDirection: 'row', gap: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
