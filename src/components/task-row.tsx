/**
 * One task in the Today list.
 *
 * Swipe left for Edit and Delete (see SwipeRow, which also hands both to
 * VoiceOver as actions).
 */
import { StyleSheet, Text, View } from 'react-native';

import type { Task } from '@/data/types';
import { splitTime } from '@/lib/format';
import { Type, useTheme } from '@/theme/theme';

import { SwipeRow } from './swipe-row';
import { Icon, Tick } from './ui';

export function TaskRow({
  task,
  first,
  hour12,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  first: boolean;
  hour12: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const { time, suffix } = splitTime(task.time, hour12);
  const repeatLabel =
    task.repeat === 'daily' ? 'Every day' : task.repeat === 'weekly' ? 'Every week' : task.repeat === 'monthly' ? 'Every month' : '';

  return (
    <SwipeRow
      onPress={onEdit}
      inRowActions={[{ name: 'toggle', label: task.done ? 'Mark not done' : 'Mark done', onPress: onToggle }]}
      actions={[
        { name: 'edit', label: 'Edit', icon: 'pencil', background: theme.accent, ink: theme.onAccent, onPress: onEdit },
        { name: 'delete', label: 'Delete', icon: 'trash', background: theme.bad, ink: '#FFFFFF', onPress: onDelete },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${task.title}, ${time} ${suffix}${repeatLabel ? `, ${repeatLabel.toLowerCase()}` : ''}${task.notes ? `, notes: ${task.notes}` : ''}`}
      accessibilityHint="Opens the task"
      style={[
        styles.row,
        { backgroundColor: theme.card },
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
      ]}>
      <View style={styles.time}>
        <Text style={{ color: theme.ink, fontSize: Type.callout, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
          {time}
        </Text>
        {suffix ? <Text style={{ color: theme.ink2, fontSize: Type.caption }}>{suffix}</Text> : null}
      </View>
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
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
