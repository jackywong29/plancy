/**
 * A finance entry: income, savings, spending or a bill.
 *
 * `?kind=bill&month=YYYY-MM` opens a new one; `?id=...` opens an existing one
 * for editing, which is the same form with its fields filled in and Save in
 * place of Add. An entry's month never changes here — move it by deleting and
 * adding, which is rare enough not to earn a control.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Card, Row, SectionHead, Segmented } from '@/components/ui';
import { useStore } from '@/data/store';
import type { MoneyKind } from '@/data/types';
import { formatAmount, formatMonthLong, isoMonth, todayIso } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { Space, Type, useTheme } from '@/theme/theme';

const KINDS: { value: MoneyKind; label: string }[] = [
  { value: 'bill', label: 'Bill' },
  { value: 'income', label: 'Income' },
  { value: 'saving', label: 'Savings' },
  { value: 'spending', label: 'Spending' },
];

export default function MoneySheet() {
  const params = useLocalSearchParams<{ kind?: MoneyKind; month?: string; id?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { settings, money, addMoney, editMoney } = useStore();

  const editing = params.id ? money.find((m) => m.id === params.id) : undefined;
  const month = editing?.month ?? params.month ?? isoMonth(todayIso());
  const [kind, setKind] = useState<MoneyKind>(editing?.kind ?? params.kind ?? 'spending');
  const [label, setLabel] = useState(editing?.label ?? '');
  const [minor, setMinor] = useState(editing?.amountMinor ?? 0);
  const [dueDay, setDueDay] = useState(editing?.dueDay === null || editing?.dueDay === undefined ? '' : String(editing.dueDay));
  const [repeatMonthly, setRepeatMonthly] = useState(editing?.repeatMonthly ?? true);

  const due = Number(dueDay);
  const dueOk = kind !== 'bill' || dueDay === '' || (Number.isInteger(due) && due >= 1 && due <= 31);
  const canSave = label.trim().length > 0 && minor > 0 && dueOk;

  function save() {
    if (!canSave) return;
    const fields = {
      kind,
      label: label.trim(),
      amountMinor: minor,
      dueDay: kind === 'bill' && dueDay !== '' ? due : null,
      repeatMonthly: kind === 'bill' ? repeatMonthly : false,
    };
    // Editing leaves `paid` alone: whether a bill is settled is not something
    // this form asks about, and the tick on Finance owns it.
    if (editing) editMoney(editing.id, fields);
    else addMoney({ ...fields, month, paid: false });
    haptic('saved');
    router.back();
  }

  const placeholder = { bill: 'Bill name', income: 'Where from', saving: 'Account, fund or holding', spending: 'What for' }[kind];

  return (
    <View style={{ flex: 1, backgroundColor: theme.ground }}>
      <Stack.Screen
        options={{
          title: editing ? editing.label || 'Entry' : formatMonthLong(month),
          // Native bar buttons, so iOS draws their glass for the current
          // appearance: close on the left, confirm on the right, as in iOS 26.
          unstable_headerLeftItems: () => [
            { type: 'button', label: 'Cancel', icon: { type: 'sfSymbol', name: 'xmark' }, onPress: () => router.back() },
          ],
          unstable_headerRightItems: () => [
            {
              type: 'button',
              label: editing ? 'Save' : 'Add',
              accessibilityLabel: editing ? 'Save changes' : 'Add entry',
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
          <Segmented label="Kind of entry" options={KINDS} value={kind} onChange={setKind} />
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
              autoFocus={!editing}
              accessibilityLabel="Name"
              style={{ flex: 1, color: theme.ink, fontSize: Type.body, paddingVertical: 4 }}
            />
          </Row>
          <Row>
            <Text style={{ color: theme.ink2, fontSize: Type.body }}>{settings.currency}</Text>
            <Amount minor={minor} onChange={setMinor} currency={settings.currency} />
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
                  style={{ minWidth: 80, textAlign: 'right', color: dueOk ? theme.ink : theme.bad, fontSize: Type.body }}
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

/**
 * The amount, entered the way a bank app does it: digits fill in from the
 * right, so 1 · 2 · 5 · 0 reads 0.01, 0.12, 1.25, 12.50. There is no decimal
 * point to type and no separator to get wrong — what's held is the number of
 * minor units, which is exactly what gets stored.
 *
 * The real input sits invisibly on top of the formatted text so the caret can
 * never land in the middle of a number. VoiceOver reads the input, and the
 * text under it is hidden to avoid saying the amount twice.
 */
function Amount({
  minor,
  onChange,
  currency,
}: {
  minor: number;
  onChange: (minor: number) => void;
  currency: string;
}) {
  const theme = useTheme();
  const ref = useRef<TextInput>(null);
  return (
    <Pressable
      // Only here to widen the tap target onto the field. VoiceOver should
      // land on the input itself, which carries the label and the value.
      accessible={false}
      style={{ flex: 1 }}
      onPress={() => ref.current?.focus()}>
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          color: minor > 0 ? theme.ink : theme.ink3,
          fontSize: Type.body,
          textAlign: 'right',
          paddingVertical: 4,
          fontVariant: ['tabular-nums'],
        }}>
        {formatAmount(minor, currency)}
      </Text>
      <TextInput
        ref={ref}
        // Digits only, never the formatted string: appending a digit and
        // deleting one then both fall out of it for free.
        value={minor > 0 ? String(minor) : ''}
        onChangeText={(text) => onChange(Number(text.replace(/\D/g, '').slice(0, 12)) || 0)}
        keyboardType="number-pad"
        keyboardAppearance={theme.scheme}
        caretHidden
        autoFocus={false}
        accessibilityLabel={`Amount in ${currency}`}
        accessibilityValue={{ text: formatAmount(minor, currency) }}
        style={[StyleSheet.absoluteFill, { color: 'transparent' }]}
      />
    </Pressable>
  );
}


