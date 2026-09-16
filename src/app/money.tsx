/**
 * Add a finance entry: income, saving, spending or a bill.
 * Opened with `?kind=bill&month=YYYY-MM`.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Card, Row, SectionHead } from '@/components/ui';
import { useStore } from '@/data/store';
import type { MoneyKind } from '@/data/types';
import { formatMonthLong, isoMonth, parseMoney, todayIso } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { Space, Type, useTheme } from '@/theme/theme';

const KINDS: { value: MoneyKind; label: string }[] = [
  { value: 'bill', label: 'Bill' },
  { value: 'income', label: 'Income' },
  { value: 'saving', label: 'Saving' },
  { value: 'spending', label: 'Spending' },
];

export default function MoneySheet() {
  const params = useLocalSearchParams<{ kind?: MoneyKind; month?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { settings, addMoney } = useStore();

  const month = params.month ?? isoMonth(todayIso());
  const [kind, setKind] = useState<MoneyKind>(params.kind ?? 'spending');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [repeatMonthly, setRepeatMonthly] = useState(true);

  const minor = parseMoney(amount, settings.currency);
  const due = Number(dueDay);
  const dueOk = kind !== 'bill' || dueDay === '' || (Number.isInteger(due) && due >= 1 && due <= 31);
  const canSave = label.trim().length > 0 && minor !== null && minor > 0 && dueOk;

  function save() {
    if (!canSave || minor === null) return;
    addMoney({
      month,
      kind,
      label: label.trim(),
      amountMinor: minor,
      dueDay: kind === 'bill' && dueDay !== '' ? due : null,
      paid: false,
      repeatMonthly: kind === 'bill' ? repeatMonthly : false,
    });
    haptic('saved');
    router.back();
  }

  const placeholder = { bill: 'Bill name', income: 'Where from', saving: 'Account or fund', spending: 'What for' }[kind];

  return (
    <View style={{ flex: 1, backgroundColor: theme.ground }}>
      <Stack.Screen
        options={{
          title: formatMonthLong(month),
          // Native bar buttons, so iOS draws their glass for the current
          // appearance: close on the left, confirm on the right, as in iOS 26.
          unstable_headerLeftItems: () => [
            { type: 'button', label: 'Cancel', icon: { type: 'sfSymbol', name: 'xmark' }, onPress: () => router.back() },
          ],
          unstable_headerRightItems: () => [
            {
              type: 'button',
              label: 'Add',
              accessibilityLabel: 'Add entry',
              icon: { type: 'sfSymbol', name: 'checkmark' },
              variant: 'prominent',
              tintColor: theme.accent,
              disabled: !canSave,
              onPress: save,
            },
          ],
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: Space.gutter, paddingTop: 12, paddingBottom: 40 }}
        keyboardDismissMode="interactive">
        <Card style={{ padding: 12 }}>
          <View style={[styles.segment, { backgroundColor: theme.fill }]}>
            {KINDS.map((k) => {
              const selected = kind === k.value;
              return (
                <Pressable
                  key={k.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setKind(k.value)}
                  style={[styles.segmentItem, selected && { backgroundColor: theme.card }]}>
                  <Text style={{ color: theme.ink, fontSize: Type.callout, fontWeight: selected ? '600' : '500' }}>{k.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <SectionHead title="Details" />
        <Card>
          <Row first>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder={placeholder}
              placeholderTextColor={theme.ink3}
              keyboardAppearance={theme.scheme}
              autoFocus
              accessibilityLabel="Name"
              style={{ flex: 1, color: theme.ink, fontSize: 17, paddingVertical: 4 }}
            />
          </Row>
          <Row>
            <Text style={{ color: theme.ink2, fontSize: 17 }}>{settings.currency}</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={theme.ink3}
              keyboardAppearance={theme.scheme}
              keyboardType="decimal-pad"
              accessibilityLabel={`Amount in ${settings.currency}`}
              style={{ flex: 1, color: theme.ink, fontSize: 17, paddingVertical: 4, fontVariant: ['tabular-nums'] }}
            />
          </Row>
        </Card>

        {kind === 'bill' ? (
          <>
            <SectionHead title="Bill" />
            <Card>
              <Row first>
                <Text style={{ flex: 1, color: theme.ink, fontSize: Type.body }}>Due on day</Text>
                <TextInput
                  value={dueDay}
                  onChangeText={setDueDay}
                  placeholder="1 to 31"
                  placeholderTextColor={theme.ink3}
                  keyboardAppearance={theme.scheme}
                  keyboardType="number-pad"
                  maxLength={2}
                  accessibilityLabel="Due day of the month"
                  style={{ width: 80, textAlign: 'right', color: dueOk ? theme.ink : theme.bad, fontSize: 17 }}
                />
              </Row>
              <Row>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.ink, fontSize: Type.body }}>Repeat every month</Text>
                  <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>Added to each new month, unpaid</Text>
                </View>
                <Switch value={repeatMonthly} onValueChange={setRepeatMonthly} trackColor={{ true: theme.accent }} accessibilityLabel="Repeat every month" />
              </Row>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', borderRadius: 9, padding: 2 },
  segmentItem: { flex: 1, paddingVertical: 7, borderRadius: 7, alignItems: 'center' },
});
