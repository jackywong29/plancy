/**
 * One finance entry.
 *
 * The same shape as a task row on purpose: tap to open it, swipe left for Edit
 * and Delete, and a bill's tick sits in the row. Finance used to answer a tap
 * with a delete alert, which was the only place in plancy that asked "are you
 * sure" instead of offering Undo.
 */
import { StyleSheet, Text, View } from 'react-native';

import type { MoneyEntry, MoneyKind } from '@/data/types';
import { formatMoney } from '@/lib/format';
import { Space, Type, useTheme, type Theme } from '@/theme/theme';

import { SwipeRow } from './swipe-row';
import { Tick } from './ui';

/**
 * Money in is green, money out is ordinary ink — the way a bank statement
 * reads, and not a traffic light. Most entries in a month are spending, so
 * colouring those red would leave the screen permanently alarmed and make red
 * mean nothing. Red is kept for a bill that is actually late.
 */
export function amountColour(kind: MoneyKind, paid: boolean, theme: Theme): string {
  if (kind === 'income' || kind === 'saving') return theme.good;
  if (kind === 'bill' && paid) return theme.ink3;
  return theme.ink;
}

export const isMoneyIn = (kind: MoneyKind): boolean => kind === 'income' || kind === 'saving';

/** "Due in 3 days", "Overdue by 2 days", "Paid" — a bill's second line. */
export function dueLabel(entry: MoneyEntry, today: number): string {
  if (entry.paid) return 'Paid';
  if (entry.dueDay === null) return '';
  const days = entry.dueDay - today;
  if (days < 0) return `Overdue by ${-days} ${-days === 1 ? 'day' : 'days'}`;
  if (days === 0) return 'Due today';
  return `Due in ${days} ${days === 1 ? 'day' : 'days'}`;
}

export function MoneyRow({
  entry,
  first,
  currency,
  today,
  onEdit,
  onDelete,
  onTogglePaid,
}: {
  entry: MoneyEntry;
  first: boolean;
  currency: string;
  /** Day of the month today, for working out whether a bill is late. */
  today: number;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePaid: () => void;
}) {
  const theme = useTheme();
  const bill = entry.kind === 'bill';
  const days = entry.dueDay === null ? null : entry.dueDay - today;
  const overdue = bill && !entry.paid && days !== null && days < 0;
  const soon = bill && !entry.paid && days !== null && days >= 0 && days <= 7;
  const due = bill ? dueLabel(entry, today) : '';
  const amount = `${isMoneyIn(entry.kind) ? '+ ' : ''}${formatMoney(entry.amountMinor, currency)}`;

  return (
    <SwipeRow
      onPress={onEdit}
      inRowActions={bill ? [{ name: 'paid', label: entry.paid ? 'Mark unpaid' : 'Mark paid', onPress: onTogglePaid }] : []}
      actions={[
        { name: 'edit', label: 'Edit', icon: 'pencil', background: theme.accent, ink: theme.onAccent, onPress: onEdit },
        { name: 'delete', label: 'Delete', icon: 'trash', background: theme.bad, ink: '#FFFFFF', onPress: onDelete },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${entry.label}, ${amount}${due ? `, ${due.toLowerCase()}` : ''}`}
      accessibilityHint="Opens the entry"
      style={[
        styles.row,
        { backgroundColor: theme.card },
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
      ]}>
      {bill ? <Tick size={24} checked={entry.paid} onPress={onTogglePaid} label={`${entry.label} paid`} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: entry.paid ? theme.ink3 : theme.ink, fontSize: Type.body }}>{entry.label}</Text>
        {due ? (
          <Text
            style={{
              color: overdue ? theme.bad : soon ? theme.warn : theme.ink2,
              fontSize: Type.footnote,
              fontWeight: soon || overdue ? '600' : '400',
            }}>
            {due}
          </Text>
        ) : null}
      </View>
      <Text
        style={{
          color: amountColour(entry.kind, entry.paid, theme),
          fontSize: Type.body,
          fontVariant: ['tabular-nums'],
        }}>
        {amount}
      </Text>
    </SwipeRow>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.gap,
    minHeight: Space.row,
    paddingVertical: 10,
    paddingHorizontal: Space.gutter,
  },
});
