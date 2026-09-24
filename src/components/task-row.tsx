/**
 * One task in the Today list.
 *
 * Swipe left for Edit and Delete (see SwipeRow, which also hands both to
 * VoiceOver as actions).
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Task } from '@/data/types';
import { splitTime } from '@/lib/format';
import { Type, useTheme } from '@/theme/theme';

import type { Handle } from './sortable';
import { SwipeRow, type RowAction } from './swipe-row';
import { Icon, Tick } from './ui';

export function TaskRow({
  task,
  first,
  hour12,
  onToggle,
  onEdit,
  onDelete,
  handle,
  moveActions = [],
}: {
  task: Task;
  first: boolean;
  hour12: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Anytime tasks: wraps the grabber that takes the time column's place. */
  handle?: Handle;
  /** Anytime tasks: Move up / Move down, for VoiceOver. */
  moveActions?: RowAction[];
}) {
  const theme = useTheme();
  const anytime = task.time === '';
  const { time, suffix } = anytime ? { time: '', suffix: '' } : splitTime(task.time, hour12);
  const repeatLabel =
    task.repeat === 'daily' ? 'Every day' : task.repeat === 'weekly' ? 'Every week' : task.repeat === 'monthly' ? 'Every month' : '';

  return (
    <SwipeRow
      onPress={onEdit}
      inRowActions={[{ name: 'toggle', label: task.done ? 'Mark not done' : 'Mark done', onPress: onToggle }, ...moveActions]}
      actions={[
        { name: 'edit', label: 'Edit', icon: 'pencil', background: theme.accent, ink: theme.onAccent, onPress: onEdit },
        { name: 'delete', label: 'Delete', icon: 'trash', background: theme.bad, ink: '#FFFFFF', onPress: onDelete },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${task.title}, ${anytime ? 'anytime' : `${time} ${suffix}`}${repeatLabel ? `, ${repeatLabel.toLowerCase()}` : ''}${task.notes ? `, notes: ${task.notes}` : ''}`}
      accessibilityHint="Opens the task"
      style={[
        styles.row,
        { backgroundColor: theme.card },
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
      ]}>
      {anytime ? (
        <View style={styles.time}>
          {(handle ?? ((c: ReactNode) => c))(
            <View style={styles.grip} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Icon name="line.3.horizontal" size={18} color={theme.ink3} />
            </View>,
          )}
        </View>
      ) : (
        <View style={styles.time}>
          <Text style={{ color: theme.ink, fontSize: Type.callout, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            {time}
          </Text>
          {suffix ? <Text style={{ color: theme.ink2, fontSize: Type.caption }}>{suffix}</Text> : null}
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: task.done ? theme.ink3 : theme.ink,
            fontSize: Type.body,
            textDecorationLine: task.done ? 'line-through' : 'none',
          }}>
          {task.title}
        </Text>
        {task.notes ? (
          <Text numberOfLines={1} style={{ color: theme.ink2, fontSize: Type.footnote, marginTop: 1 }}>
            {task.notes}
          </Text>
        ) : null}
        {repeatLabel ? (
          <View style={styles.meta}>
            <Icon name="repeat" size={12} color={theme.ink2} />
            <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>{repeatLabel}</Text>
          </View>
        ) : null}
      </View>
      <Tick checked={task.done} onPress={onToggle} label={`${task.title} done`} />
    </SwipeRow>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10, paddingHorizontal: 16 },
  time: { minWidth: 52 },
  grip: { width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
