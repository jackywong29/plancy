import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BigTitle, Card, Empty, Icon, RoundButton, Row, Screen, SectionHead, Tick } from '@/components/ui';
import { moneyForMonth, monthTotals, useStore } from '@/data/store';
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
  const { money, settings, toggleBillPaid, deleteMoney, ensureBills } = useStore();
  const theme = useTheme();
  const router = useRouter();
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
  const share = (value: number): `${number}%` =>
    `${totals.income > 0 ? Math.max(0, (value / totals.income) * 100) : 0}%`;

  return (
    <Screen>
      <BigTitle
        actions={
          <RoundButton
            icon="plus"
            label="Add entry"
            accent
            onPress={() => router.push({ pathname: '/money', params: { kind: 'spending', month } })}
          />
        }>
        finance
      </BigTitle>

      <Card style={styles.monthPill}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setMonth(addMonths(month, -1))} style={styles.arrow}>
          <Icon name="chevron.left" size={20} color={theme.accentText} />
        </Pressable>
        <Text style={{ color: theme.ink, fontSize: Type.body, fontWeight: '600' }}>{formatMonthLong(month)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setMonth(addMonths(month, 1))} style={styles.arrow}>
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
            <Text style={{ color: totals.left < 0 ? theme.bad : theme.ink, fontFamily: Type.display, fontSize: 40 }}>
              {formatMoney(totals.left, currency)}
            </Text>
            <View style={styles.split} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={{ width: share(totals.saving), backgroundColor: theme.accent }} />
              <View style={{ width: share(totals.spent), backgroundColor: theme.ink3 }} />
              <View style={{ flex: 1, backgroundColor: theme.good }} />
            </View>
            <View style={{ flexDirection: 'row' }}>
              {[
                { label: 'Saved', value: totals.saving, colour: theme.accent },
                { label: 'Spent', value: totals.spent, colour: theme.ink3 },
                { label: 'Left', value: totals.left, colour: theme.good },
              ].map((item) => (
                <View key={item.label} style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.colour }} />
                    <Text style={{ color: theme.ink2, fontSize: Type.caption }}>{item.label}</Text>
                  </View>
                  <Text style={{ color: theme.ink, fontSize: Type.footnote, fontWeight: '600' }}>
                    {formatMoney(item.value, currency)}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

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
                  {rows.map((entry, i) => {
                    // Red only alongside words: colour on its own says nothing
                    // to a reader who can't see it.
                    const days = entry.dueDay === null ? null : entry.dueDay - today;
                    const soon = kind === 'bill' && !entry.paid && days !== null && days <= 7;
                    return (
                      <Row
                        key={entry.id}
                        first={i === 0}
                        onPress={() =>
                          Alert.alert(entry.label, formatMoney(entry.amountMinor, currency), [
                            { text: 'Delete', style: 'destructive', onPress: () => deleteMoney(entry.id) },
                            { text: 'Cancel', style: 'cancel' },
                          ])
                        }>
                        {kind === 'bill' ? (
                          <Tick
                            size={24}
                            checked={entry.paid}
                            onPress={() => toggleBillPaid(entry.id)}
                            label={`${entry.label} paid`}
                          />
                        ) : null}
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: entry.paid ? theme.ink3 : theme.ink, fontSize: Type.body }}>
                            {entry.label}
                          </Text>
                          {kind === 'bill' ? (
                            <Text
                              style={{
                                color: soon ? theme.bad : theme.ink2,
                                fontSize: Type.footnote,
                                fontWeight: soon ? '600' : '400',
                              }}>
                              {entry.paid
                                ? 'Paid'
                                : days !== null && days < 0
                                  ? `Overdue by ${-days} ${-days === 1 ? 'day' : 'days'}`
                                  : days === 0
                                    ? 'Due today'
                                    : `Due in ${days} ${days === 1 ? 'day' : 'days'}`}
                            </Text>
                          ) : null}
                        </View>
                        <Text
                          style={{
                            color: kind === 'income' ? theme.good : theme.ink,
                            fontSize: Type.body,
                            fontVariant: ['tabular-nums'],
                          }}>
                          {formatMoney(entry.amountMinor, currency)}
                        </Text>
                      </Row>
                    );
                  })}
                  <Row
                    onPress={() => router.push({ pathname: '/money', params: { kind, month } })}
                    accessibilityLabel={`Add ${title.toLowerCase()}`}>
                    <Icon name="plus" size={16} color={theme.accentText} />
                    <Text style={{ color: theme.accentText, fontSize: Type.body }}>
                      Add {kind === 'bill' ? 'bill' : kind === 'income' ? 'income' : kind === 'saving' ? 'saving' : 'spending'}
                    </Text>
                  </Row>
                </Card>
              </View>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 4, marginBottom: 12 },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  split: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 12, marginTop: 12 },
});
