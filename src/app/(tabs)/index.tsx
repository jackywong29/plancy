import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Calendar } from '@/components/calendar';
import { DotBurst, useCelebrate } from '@/components/celebration';
import { TaskRow } from '@/components/task-row';
import { useToast } from '@/components/toast';
import { BigTitle, Card, Empty, Fab, FAB_CLEARANCE, Icon, RoundButton, Screen, SectionHead, useAccessibilitySize } from '@/components/ui';
import { countsByDate, streak, tasksForDay, useStore } from '@/data/store';
import type { Task } from '@/data/types';
import { celebrationFor } from '@/lib/celebrate';
import { addDays, addMonths, formatDayLong, isoMonth, todayIso } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { Space, Type, useTheme } from '@/theme/theme';

const GLIDE = LinearTransition.duration(280);

export default function TodayScreen() {
  const { tasks, settings, setSetting, toggleTask, deleteTask, restoreTask, ensureRepeats } = useStore();
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const celebrate = useCelebrate();
  const today = todayIso();
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(isoMonth(today));
  const [burst, setBurst] = useState(0);
  const bigText = useAccessibilitySize();
  const seen = useRef(new Set<string>());

  // Repeating tasks are created ahead as far as the calendar can see.
  useEffect(() => {
    const monthEnd = addDays(`${addMonths(month, 1)}-01`, -1);
    ensureRepeats(settings.calendar === 'month' && monthEnd > addDays(day, 7) ? monthEnd : addDays(day, 7));
  }, [day, month, settings.calendar, ensureRepeats]);

  const list = tasksForDay(tasks, day);
  const done = list.filter((t) => t.done).length;
  const allDone = list.length > 0 && done === list.length;
  const counts = countsByDate(tasks);
  const days = streak(tasks, today);

  const title =
    day === today ? 'today' : day === addDays(today, 1) ? 'tomorrow' : day === addDays(today, -1) ? 'yesterday'
      : formatDayLong(day).split(' ')[0].toLowerCase();

  /**
   * The one owner of task-tick feedback: it knows whether this tick finished
   * the day, so it picks between a plain tick and a celebration.
   */
  function toggle(task: Task) {
    const nowDone = !task.done;
    toggleTask(task.id);
    if (!nowDone) {
      haptic('untick');
      return;
    }
    const after = tasks.map((t) => (t.id === task.id ? { ...t, done: true } : t));
    const moment = celebrationFor(after, task.date, today, seen.current);
    if (!moment) {
      haptic('tick');
      return;
    }
    setBurst((n) => n + 1);
    if (moment.kind === 'day') {
      haptic('dayDone');
      AccessibilityInfo.announceForAccessibility(`${title}, done.`);
    } else {
      haptic('milestone');
      // Let the card's own moment land first, then the bigger one.
      setTimeout(() => celebrate(moment), 650);
    }
  }

  function remove(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    haptic('remove');
    deleteTask(id);
    toast('Task deleted', { label: 'Undo', onPress: () => restoreTask(task) });
  }

  const addTask = () => router.push({ pathname: '/task', params: { date: day } });

  return (
    <View style={{ flex: 1 }}>
      <Screen bottomInset={FAB_CLEARANCE}>
        <LayoutAnimationConfig skipEntering>
          <BigTitle
            subtitle={formatDayLong(day)}
            // Adding lives in the Fab at the bottom of the screen now, so the
            // title line carries only Settings.
            actions={<RoundButton icon="gearshape" label="Settings" onPress={() => router.push('/settings')} />}>
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

          {/* Everything under the calendar glides as it opens and closes, and
              crossfades when you pick another day. */}
          <Animated.View layout={GLIDE}>
            <Animated.View key={day} entering={FadeIn.duration(200)}>
              {list.length > 0 ? (
                <Card style={styles.progress}>
                  {/* "2 of 5 done" and the streak sit side by side until the
                    text is large enough that the streak would run off the
                    card, and then one goes under the other. */}
                <View style={[styles.progressTop, bigText && styles.progressTopStacked]}>
                    {allDone ? (
                      <DoneTitle title={title} celebrate={burst} />
                    ) : (
                      <Text style={{ color: theme.ink, fontSize: Type.sectionTitle, fontWeight: '600' }}>
                        {done} of {list.length} done
                      </Text>
                    )}
                    {days > 0 ? <Streak days={days} /> : null}
                  </View>
                  <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    {list.map((t) => (
                      <ProgressDot key={t.id} done={t.done} />
                    ))}
                  </View>
                  {allDone ? <DotBurst id={burst} /> : null}
                </Card>
              ) : null}

              {list.length === 0 ? (
                <View style={{ marginTop: 14 }}>
                  <Empty title="Nothing planned" body="Tap the + button to add the first thing for this day." />
                </View>
              ) : (
                <>
                  <SectionHead title="Tasks" />
                  <Card>
                    {list.map((task, i) => (
                      <Animated.View key={task.id} layout={GLIDE} entering={FadeInDown.duration(220)} exiting={FadeOut.duration(160)}>
                        <TaskRow
                          task={task}
                          first={i === 0}
                          hour12={settings.hour12}
                          onToggle={() => toggle(task)}
                          onEdit={() => router.push({ pathname: '/task', params: { id: task.id } })}
                          onDelete={() => remove(task.id)}
                        />
                      </Animated.View>
                    ))}
                  </Card>
                  <Text style={{ color: theme.ink3, fontSize: Type.footnote, textAlign: 'center', marginTop: 12 }}>
                    Swipe a task left to edit or delete it.
                  </Text>
                </>
              )}
            </Animated.View>
          </Animated.View>
        </LayoutAnimationConfig>
      </Screen>
      <Fab icon="plus" label="Add task" onPress={addTask} />
    </View>
  );
}

/** "today, done." with the accent dot dropping into place when it's earned. */
function DoneTitle({ title, celebrate }: { title: string; celebrate: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const drop = useSharedValue(0);
  const shown = useRef(celebrate);

  useEffect(() => {
    // Opening an already finished day draws it quietly; only the tick that
    // finishes it plays the drop.
    if (celebrate === shown.current || reduced) return;
    shown.current = celebrate;
    drop.value = withSequence(withTiming(-28, { duration: 0 }), withSpring(0, { damping: 7, stiffness: 220 }));
  }, [celebrate, drop, reduced]);

  const dotStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value }] }));

  return (
    <View style={styles.doneTitle} accessibilityRole="header" accessibilityLabel={`${title}, done`}>
      <Text style={{ color: theme.ink, fontFamily: Type.display, fontSize: 22 }}>{title}, done</Text>
      <Animated.Text style={[{ color: theme.accent, fontFamily: Type.display, fontSize: 22 }, dotStyle]}>.</Animated.Text>
    </View>
  );
}

/** The streak count, which gives a small pop each time it grows. */
function Streak({ days }: { days: number }) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const last = useRef(days);
  useEffect(() => {
    if (days > last.current) scale.value = withSequence(withTiming(1.25, { duration: 140 }), withSpring(1, { damping: 8 }));
    last.current = days;
  }, [days, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.streak, style]} accessible accessibilityLabel={`${days}-day streak`}>
      <Icon name="flame.fill" size={13} color={theme.accentText} />
      <Text style={{ color: theme.ink2, fontSize: Type.footnote, fontWeight: '600' }}>{days}-day streak</Text>
    </Animated.View>
  );
}

/** One dot per task; it fills with a little spring as the task is ticked. */
function ProgressDot({ done }: { done: boolean }) {
  const theme = useTheme();
  const fill = done ? theme.accent : theme.fill;
  const style = useAnimatedStyle(() => ({
    backgroundColor: withTiming(fill, { duration: 220 }),
    transform: [{ scale: withSpring(done ? 1 : 0.86, { damping: 10, stiffness: 240 }) }],
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  progress: { marginTop: 12, padding: Space.gutter, gap: 12, overflow: 'visible' },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28, gap: 8 },
  progressTopStacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 6 },
  doneTitle: { flexDirection: 'row', alignItems: 'flex-end' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dot: { width: 14, height: 14, borderRadius: 7 },
});
