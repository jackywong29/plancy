import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BigTitle, Card, Empty, Icon, Row, RoundButton, Screen, SectionHead, Tick } from '@/components/ui';
import { countsByDate, streak, tasksForDay, useStore } from '@/data/store';
import type { Task } from '@/data/types';
import { addDays, formatDayLong, splitTime, todayIso, weekOf, weekdayInitials } from '@/lib/format';
import { Space, Type, useTheme } from '@/theme/theme';

export default function TodayScreen() {
  const { tasks, settings, toggleTask, addTask, deleteTask, moveTask } = useStore();
  const theme = useTheme();
  const router = useRouter();
  const today = todayIso();
  const [day, setDay] = useState(today);
  const [draft, setDraft] = useState('');

  const list = tasksForDay(tasks, day);
  const done = list.filter((t) => t.done).length;
  const counts = countsByDate(tasks);
  const days = streak(tasks, today);

  const title =
    day === today ? 'today' : day === addDays(today, 1) ? 'tomorrow' : day === addDays(today, -1) ? 'yesterday'
      : formatDayLong(day).split(' ')[0].toLowerCase();

  function commit() {
    const text = draft.trim();
    if (!text) return;
    addTask({ date: day, time: nextHalfHour(), title: text, repeat: '' });
    setDraft('');
  }

  /**
   * Move, edit and delete live behind a long press for now. Swipe comes next,
   * and these stay: a swipe is invisible to VoiceOver on its own.
   */
  function actions(task: Task) {
    Alert.alert(task.title, undefined, [
      { text: 'Move to tomorrow', onPress: () => moveTask(task.id, addDays(task.date, 1)) },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask(task.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <Screen>
      <View style={styles.topbar}>
        <RoundButton icon="gearshape" label="Settings" onPress={() => router.push('/settings')} />
      </View>

      <BigTitle subtitle={formatDayLong(day)}>{title}</BigTitle>

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
              <Text style={{ color: theme.ink3, fontSize: Type.caption }}>{weekdayInitials(settings.weekStart)[i]}</Text>
              <View
                style={[
                  styles.dayNumber,
                  selected && { backgroundColor: theme.accent },
                ]}>
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
                  <View
                    key={p}
                    style={[
                      styles.pip,
                      { backgroundColor: p < (count?.done ?? 0) ? theme.accent : theme.ink3 },
                    ]}
                  />
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
            {days > 0 ? (
              <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>
                {days}-day streak
              </Text>
            ) : null}
          </View>
          <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {list.map((t) => (
              <View
                key={t.id}
                style={[styles.dot, { backgroundColor: t.done ? theme.accent : theme.fill }]}
              />
            ))}
          </View>
        </Card>
      ) : null}

      {list.length === 0 ? (
        <View style={{ marginTop: 14 }}>
          <Empty title="Nothing planned" body="Add the first thing below, and it will show up in your widget too." />
        </View>
      ) : (
        <>
          <SectionHead title="Tasks" />
          <Card>
            {list.map((task, i) => {
              const { time, suffix } = splitTime(task.time, settings.hour12);
              return (
                <Row key={task.id} first={i === 0} onPress={() => actions(task)} accessibilityLabel={`${task.title}, ${time} ${suffix}`}>
                  <View style={styles.time}>
                    <Text style={{ color: theme.ink, fontSize: Type.callout, fontWeight: '600' }}>{time}</Text>
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
                    {task.repeat ? (
                      <View style={styles.meta}>
                        <Icon name="repeat" size={12} color={theme.ink2} />
                        <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>
                          {task.repeat === 'daily' ? 'Every day' : task.repeat === 'weekly' ? 'Every week' : 'Every month'}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Tick checked={task.done} onPress={() => toggleTask(task.id)} label={`${task.title} done`} />
                </Row>
              );
            })}
          </Card>
        </>
      )}

      <Card style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={commit}
          placeholder="Add a task"
          placeholderTextColor={theme.ink3}
          returnKeyType="done"
          accessibilityLabel="New task"
          style={{ flex: 1, color: theme.ink, fontSize: Type.body, paddingVertical: 12 }}
        />
        <RoundButton icon="plus" label="Add task" onPress={commit} accent />
      </Card>
    </Screen>
  );
}

/** New tasks land on the next :00 or :30, as in the web planner. */
function nextHalfHour(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() <= 30 ? 30 : 60);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', justifyContent: 'flex-end', minHeight: 44 },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -4 },
  day: { alignItems: 'center', gap: 3, paddingVertical: 2, flex: 1 },
  dayNumber: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  pips: { flexDirection: 'row', gap: 3, height: 5 },
  pip: { width: 5, height: 5, borderRadius: 2.5 },
  progress: { marginTop: 12, padding: Space.gutter, gap: 12 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  time: { width: 52 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  composer: { marginTop: 12, flexDirection: 'row', alignItems: 'center', paddingLeft: Space.gutter, paddingRight: 6, gap: 8 },
});
