import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TaskRow } from '@/components/task-row';
import { useToast } from '@/components/toast';
import { BigTitle, Card, Empty, RoundButton, Screen, SectionHead } from '@/components/ui';
import { countsByDate, streak, tasksForDay, useStore } from '@/data/store';
import { addDays, formatDayLong, todayIso, weekOf, weekdayInitials } from '@/lib/format';
import { Space, Type, useTheme } from '@/theme/theme';

export default function TodayScreen() {
  const { tasks, settings, toggleTask, deleteTask, restoreTask, ensureRepeats } = useStore();
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const today = todayIso();
  const [day, setDay] = useState(today);

  useEffect(() => {
    ensureRepeats(addDays(day, 7));
  }, [day, ensureRepeats]);

  const list = tasksForDay(tasks, day);
  const done = list.filter((t) => t.done).length;
  const counts = countsByDate(tasks);
  const days = streak(tasks, today);
  const initials = weekdayInitials(settings.weekStart);

  const title =
    day === today ? 'today' : day === addDays(today, 1) ? 'tomorrow' : day === addDays(today, -1) ? 'yesterday'
      : formatDayLong(day).split(' ')[0].toLowerCase();

  function remove(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    deleteTask(id);
    toast('Task deleted', { label: 'Undo', onPress: () => restoreTask(task) });
  }

  return (
    <Screen>
      <BigTitle
        subtitle={formatDayLong(day)}
        actions={
          <>
            <RoundButton icon="gearshape" label="Settings" onPress={() => router.push('/settings')} />
            <RoundButton icon="plus" label="Add task" accent onPress={() => router.push({ pathname: '/task', params: { date: day } })} />
          </>
        }>
        {title}
      </BigTitle>

      <View style={styles.week}>
        {weekOf(day, settings.weekStart).map((iso, i) => {
          const count = counts.get(iso);
          const selected = iso === day;
          return (
            <Pressable
              key={iso}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={formatDayLong(iso)}
              onPress={() => setDay(iso)}
              style={styles.day}>
              <Text style={{ color: theme.ink3, fontSize: Type.caption }}>{initials[i]}</Text>
              <View style={[styles.dayNumber, selected && { backgroundColor: theme.accent }]}>
                <Text
                  style={{
                    color: selected ? theme.onAccent : iso === today ? theme.accentText : theme.ink,
                    fontSize: 17,
                    fontWeight: selected || iso === today ? '700' : '500',
                  }}>
                  {Number(iso.slice(8))}
                </Text>
              </View>
              <View style={styles.pips}>
                {Array.from({ length: Math.min(count?.total ?? 0, 3) }, (_, p) => (
                  <View key={p} style={[styles.pip, { backgroundColor: p < (count?.done ?? 0) ? theme.accent : theme.ink3 }]} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>

      {list.length > 0 ? (
        <Card style={styles.progress}>
          <View style={styles.progressTop}>
            <Text style={{ color: theme.ink, fontSize: Type.sectionTitle, fontWeight: '600' }}>
              {done} of {list.length} done
            </Text>
            {days > 0 ? <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>{days}-day streak</Text> : null}
          </View>
          <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {list.map((t) => (
              <View key={t.id} style={[styles.dot, { backgroundColor: t.done ? theme.accent : theme.fill }]} />
            ))}
          </View>
        </Card>
      ) : null}

      {list.length === 0 ? (
        <View style={{ marginTop: 14 }}>
          <Empty title="Nothing planned" body="Tap + to add the first thing for this day." />
        </View>
      ) : (
        <>
          <SectionHead title="Tasks" />
          <Card>
            {list.map((task, i) => (
              <TaskRow
                key={task.id}
                task={task}
                first={i === 0}
                hour12={settings.hour12}
                onToggle={() => toggleTask(task.id)}
                onEdit={() => router.push({ pathname: '/task', params: { id: task.id } })}
                onDelete={() => remove(task.id)}
              />
            ))}
          </Card>
          <Text style={{ color: theme.ink3, fontSize: Type.footnote, textAlign: 'center', marginTop: 12 }}>
            Swipe a task left to edit or delete it.
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -4 },
  day: { alignItems: 'center', gap: 3, paddingVertical: 2, flex: 1 },
  dayNumber: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  pips: { flexDirection: 'row', gap: 3, height: 5 },
  pip: { width: 5, height: 5, borderRadius: 2.5 },
  progress: { marginTop: 12, padding: Space.gutter, gap: 12 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 14, height: 14, borderRadius: 7 },
});
