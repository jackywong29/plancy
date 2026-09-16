/**
 * One task in the Today list.
 *
 * Swipe left for Edit and Delete. The same two actions are exposed as
 * accessibility actions, because a swipe on its own is invisible to VoiceOver.
 */
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import type { Task } from '@/data/types';
import { splitTime } from '@/lib/format';
import { Type, useTheme } from '@/theme/theme';

import { Icon, Tick } from './ui';

const ACTION_WIDTH = 76;

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
  const swipe = useRef<SwipeableMethods>(null);
  const { time, suffix } = splitTime(task.time, hour12);
  const repeatLabel =
    task.repeat === 'daily' ? 'Every day' : task.repeat === 'weekly' ? 'Every week' : task.repeat === 'monthly' ? 'Every month' : '';

  const act = (fn: () => void) => () => {
    swipe.current?.close();
    fn();
  };

  return (
    <ReanimatedSwipeable
      ref={swipe}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit task"
            onPress={act(onEdit)}
            style={[styles.action, { backgroundColor: theme.accent }]}>
            <Icon name="pencil" size={20} color={theme.onAccent} />
            <Text style={[styles.actionLabel, { color: theme.onAccent }]}>Edit</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete task"
            onPress={act(onDelete)}
            style={[styles.action, { backgroundColor: theme.bad }]}>
            <Icon name="trash" size={20} color="#FFFFFF" />
            <Text style={[styles.actionLabel, { color: '#FFFFFF' }]}>Delete</Text>
          </Pressable>
        </View>
      )}>
      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={`${task.title}, ${time} ${suffix}${repeatLabel ? `, ${repeatLabel.toLowerCase()}` : ''}`}
        accessibilityHint="Opens the task"
        accessibilityActions={[
          { name: 'edit', label: 'Edit' },
          { name: 'delete', label: 'Delete' },
        ]}
        onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'delete' ? onDelete() : onEdit())}
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
          {repeatLabel ? (
            <View style={styles.meta}>
              <Icon name="repeat" size={12} color={theme.ink2} />
              <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>{repeatLabel}</Text>
            </View>
          ) : null}
        </View>
        <Tick checked={task.done} onPress={onToggle} label={`${task.title} done`} />
      </Pressable>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10, paddingHorizontal: 16 },
  time: { width: 52 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  actions: { flexDirection: 'row' },
  action: { width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center', gap: 3 },
  actionLabel: { fontSize: Type.caption, fontWeight: '600' },
});
