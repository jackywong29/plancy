import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Calendar } from '@/components/calendar';
import { TaskRow } from '@/components/task-row';
import { useToast } from '@/components/toast';
import { BigTitle, Card, Empty, RoundButton, Screen, SectionHead } from '@/components/ui';
import { countsByDate, streak, tasksForDay, useStore } from '@/data/store';
import { addDays, addMonths, formatDayLong, isoMonth, todayIso } from '@/lib/format';
import { Space, Type, useTheme } from '@/theme/theme';

export default function TodayScreen() {
  const { tasks, settings, setSetting, toggleTask, deleteTask, restoreTask, ensureRepeats } = useStore();
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const today = todayIso();
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(isoMonth(today));

  // Repeating tasks are created ahead as far as the calendar can see.
  useEffect(() => {
    const monthEnd = addDays(`${addMonths(month, 1)}-01`, -1);
    ensureRepeats(settings.calendar === 'month' && monthEnd > addDays(day, 7) ? monthEnd : addDays(day, 7));
  }, [day, month, settings.calendar, ensureRepeats]);

  const list = tasksForDay(tasks, day);
  const done = list.filter((t) => t.done).length;
  const counts = countsByDate(tasks);
  const days = streak(tasks, today);

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

      <Calendar
        day={day}
        today={today}
        month={month}
        mode={settings.calendar}
        weekStart={settings.weekStart}
        counts={counts}
        onSelect={(iso) => {
          setDay(iso);
          setMonth(isoMonth(iso));
        }}
        onMonth={setMonth}
        onMode={(mode) => setSetting('calendar', mode)}
      />

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
  progress: { marginTop: 12, padding: Space.gutter, gap: 12 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 14, height: 14, borderRadius: 7 },
});
