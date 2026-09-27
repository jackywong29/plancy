import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BigTitle, Card, Empty, Icon, Row, Screen, SectionHead, useAccessibilitySize } from '@/components/ui';
import { CashFlow } from '@/components/cashflow';
import { MoneyRow } from '@/components/money-row';
import { useToast } from '@/components/toast';
import { haptic } from '@/lib/haptics';
import { moneyForMonth, monthTotals } from '@/data/select';
import { useStore } from '@/data/store';
import { useAddAction } from '@/lib/add-action';
import { PrivateLock, useLock } from '@/lib/lock';
import type { MoneyKind } from '@/data/types';
import { addMonths, formatMoney, formatMonthLong, isoMonth, todayIso } from '@/lib/format';
import { Space, Type, useTheme } from '@/theme/theme';

const SECTIONS: { kind: MoneyKind; title: string }[] = [
  { kind: 'bill', title: 'Bills' },
  { kind: 'income', title: 'Income' },
  { kind: 'saving', title: 'Savings and investments' },
  { kind: 'spending', title: 'Spending' },
];

export default function FinanceScreen() {
  const { money, settings, toggleBillPaid, deleteMoney, restoreMoney, ensureBills } = useStore();
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const bigText = useAccessibilitySize();
  const [month, setMonth] = useState(isoMonth(todayIso()));

  useEffect(() => {
    if (month >= isoMonth(todayIso())) ensureBills(month);
  }, [month, ensureBills]);

  const entries = moneyForMonth(money, month);
  const totals = monthTotals(entries);
  const unpaid = entries.filter((e) => e.kind === 'bill' && !e.paid);
  const unpaidTotal = unpaid.reduce((a, e) => a + e.amountMinor, 0);
  const today = Number(todayIso().slice(8));
  const currency = settings.currency;
  const share = (value: number): `${number}%` => `${totals.income > 0 ? Math.max(0, (value / totals.income) * 100) : 0}%`;

  const lock = useLock();
  // While Finance is locked, the add button asks for Face ID rather than
  // opening a sheet over the lock.
  useAddAction('Add money entry', () => {
    if (lock.privateLocked) void lock.unlock();
    else router.push({ pathname: '/money', params: { kind: 'spending', month } });
  });

  /** Deleting offers Undo instead of asking first, as everywhere else. */
  function remove(id: string) {
    const entry = money.find((m) => m.id === id);
    if (!entry) return;
    haptic('remove');
    deleteMoney(id);
    toast('Entry deleted', { label: 'Undo', onPress: () => restoreMoney(entry) });
  }

  return (
    <PrivateLock title="finance">
      <Screen>
          <BigTitle>finance</BigTitle>

          <Card style={styles.monthPill}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={() => {
                haptic('select');
                setMonth(addMonths(month, -1));
              }}
              style={styles.arrow}
            >
              <Icon name="chevron.left" size={20} color={theme.accentText} />
            </Pressable>
            {/* flex so a two-line month pushes the card taller rather than
              pushing the next-month chevron off the edge of the screen. */}
          <Text
            style={{ flex: 1, textAlign: 'center', color: theme.ink, fontSize: Type.body, fontWeight: '600' }}>
            {formatMonthLong(month)}
          </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => {
                haptic('select');
                setMonth(addMonths(month, 1));
              }}
              style={styles.arrow}
            >
              <Icon name="chevron.right" size={20} color={theme.accentText} />
            </Pressable>
          </Card>

          {entries.length === 0 ? (
            <Empty title="Nothing logged this month" body="Tap + to add what came in, what went out, and the bills you owe." />
          ) : (
            <>
              <Card style={{ padding: Space.gutter, gap: 12 }}>
                <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>
                  Left this month, from {formatMoney(totals.income, currency)} in
                </Text>
                <Text
                  // Display type, capped like the screen titles: it still
                  // grows, just not until "MYR 3,970.25" breaks after the
                  // currency and strands the amount on its own line.
                  maxFontSizeMultiplier={1.6}
                  style={{
                    color: totals.left < 0 ? theme.bad : theme.ink,
                    fontFamily: Type.display,
                    fontSize: 40,
                  }}
                >
                  {formatMoney(totals.left, currency)}
                </Text>
                <View style={styles.split} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  {/* Green is money kept, here and in every row below it. */}
                  <View
                    style={{
                      width: share(totals.saving),
                      backgroundColor: theme.good,
                    }}
                  />
                  <View
                    style={{
                      width: share(totals.spent),
                      backgroundColor: theme.ink3,
                    }}
                  />
                  <View style={{ flex: 1, backgroundColor: theme.accent }} />
                </View>
                {/* Three columns of money don't fit across a phone once the
                    text is large; they become three rows. */}
                <View style={{ flexDirection: bigText ? 'column' : 'row', gap: bigText ? 10 : 0 }}>
                  {[
                    {
                      label: 'Saved',
                      value: totals.saving,
                      colour: theme.good,
                    },
                    { label: 'Spent', value: totals.spent, colour: theme.ink3 },
                    { label: 'Left', value: totals.left, colour: theme.accent },
                  ].map((item) => (
                    <View key={item.label} style={{ flex: 1, gap: 2 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: item.colour,
                          }}
                        />
                        <Text style={{ color: theme.ink2, fontSize: Type.caption }}>{item.label}</Text>
                      </View>
                      <Text
                        style={{
                          color: theme.ink,
                          fontSize: Type.footnote,
                          fontWeight: '600',
                        }}
                      >
                        {formatMoney(item.value, currency)}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>

              <CashFlow money={money} month={month} currency={currency} onSelect={setMonth} />

            {unpaid.length > 0 ? (
                <View style={[styles.warn, { backgroundColor: theme.warnSoft }]}>
                  <Icon name="exclamationmark.triangle" size={18} color={theme.warn} />
                  <Text style={{ flex: 1, color: theme.ink, fontSize: Type.footnote }}>
                    {unpaid.length} {unpaid.length === 1 ? 'bill' : 'bills'} still to pay, {formatMoney(unpaidTotal, currency)}
                  </Text>
                </View>
              ) : null}

              {SECTIONS.map(({ kind, title }) => {
                const rows = entries.filter((e) => e.kind === kind);
                if (rows.length === 0) return null;
                const total = rows.reduce((a, e) => a + e.amountMinor, 0);
                return (
                  <View key={kind}>
                    <SectionHead title={title} trailing={formatMoney(total, currency)} />
                    <Card>
                      {rows.map((entry, i) => (
                        <MoneyRow
                          key={entry.id}
                          entry={entry}
                          first={i === 0}
                          currency={currency}
                          today={today}
                          onEdit={() => router.push({ pathname: '/money', params: { id: entry.id } })}
                          onDelete={() => remove(entry.id)}
                          onTogglePaid={() => {
                            haptic(entry.paid ? 'untick' : 'tick');
                            toggleBillPaid(entry.id);
                          }}
                        />
                      ))}
                      <Row
                        onPress={() =>
                          router.push({
                            pathname: '/money',
                            params: { kind, month },
                          })
                        }
                        accessibilityLabel={`Add ${title.toLowerCase()}`}
                      >
                        <Icon name="plus" size={16} color={theme.accentText} />
                        <Text style={{ color: theme.accentText, fontSize: Type.body }}>
                          Add {kind === 'bill' ? 'bill' : kind === 'income' ? 'income' : kind === 'saving' ? 'savings' : 'spending'}
                        </Text>
                      </Row>
                    </Card>
                  </View>
                );
              })}
            </>
          )}
      </Screen>
    </PrivateLock>
  );
}

const styles = StyleSheet.create({
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 4,
    marginBottom: 12,
  },
  arrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  split: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    gap: 2,
  },
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
});
