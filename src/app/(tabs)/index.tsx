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
import { askScope } from '@/components/scope-sheet';
import { moveActions, Sortable, type SortableRef } from '@/components/sortable';
import { TaskRow } from '@/components/task-row';
import { useToast } from '@/components/toast';
import { BigTitle, Card, Empty, Icon, RoundButton, Screen, SectionHead, useAccessibilitySize } from '@/components/ui';
import { anytimeOrder, isAnytime } from '@/data/order';
import { countsByDate, movedOn, streak, tasksForDay } from '@/data/select';
import { useStore, type Scope } from '@/data/store';
import type { Task } from '@/data/types';
import { useAddAction } from '@/lib/add-action';
import { celebrationFor } from '@/lib/celebrate';
import { addDays, addMonths, formatDayLong, formatDayShort, isoMonth } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useSettle } from '@/lib/settle';
import { Space, Type, useTheme } from '@/theme/theme';

const GLIDE = LinearTransition.duration(280);

export default function TodayScreen() {
  const { tasks, today, settings, setSetting, toggleTask, deleteTask, ensureRepeats, reorderTasks } = useStore();
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const celebrate = useCelebrate();
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(isoMonth(today));
  const [burst, setBurst] = useState(0);
  const bigText = useAccessibilitySize();
  const seen = useRef(new Set<string>());
  const sortable = useRef<SortableRef>(null);
  const { hold, release, placedDone } = useSettle();

  // The day turned while plancy was open. If it was showing today, it moves
  // on with it, the way it would have opened.
  const shownToday = useRef(today);
  useEffect(() => {
    if (shownToday.current === today) return;
    if (day === shownToday.current) {
      setDay(today);
      setMonth(isoMonth(today));
    }
    shownToday.current = today;
  }, [today, day]);

  // Repeating tasks are created ahead as far as the calendar can see.
  useEffect(() => {
    const monthEnd = addDays(`${addMonths(month, 1)}-01`, -1);
    ensureRepeats(settings.calendar === 'month' && monthEnd > addDays(day, 7) ? monthEnd : addDays(day, 7));
  }, [day, month, settings.calendar, ensureRepeats]);

  const dayTasks = tasks.filter((t) => t.date === day);
  // Timed tasks follow the clock. Anytime ones follow the order they're
  // dragged into, open above finished; a just-ticked one waits a moment in
  // its old place (useSettle) before it glides to the new one.
  const timedList = tasksForDay(tasks, day).filter((t) => !isAnytime(t));
  const anytimeList = anytimeOrder(dayTasks.filter(isAnytime), placedDone);
  const openAnytime = anytimeList.filter((t) => !placedDone(t));
  const openIds = openAnytime.map((t) => t.id);
  const list = [...timedList, ...anytimeList];
  // Tasks that sat unfinished here and were carried on to a later day still
  // belong to this day's tally, faded, so a past day tells the truth.
  const moved = movedOn(tasks, day);
  const total = list.length + moved.length;
  const done = list.filter((t) => t.done).length;
  const allDone = total > 0 && done === total;
  const counts = countsByDate(tasks);
  const days = streak(tasks, today);

  // What the glide needs when a held row's moment is up, as of the latest draw.
  const latest = useRef({ anytime: dayTasks.filter(isAnytime), shown: anytimeList.map((t) => t.id), placedDone });
  latest.current = { anytime: dayTasks.filter(isAnytime), shown: anytimeList.map((t) => t.id), placedDone };

  /** A held anytime row's moment is up: slide it to where it belongs, then let go. */
  function settle(id: string) {
    const { anytime, shown, placedDone: placed } = latest.current;
    const from = shown.indexOf(id);
    const to = anytimeOrder(anytime, (t) => (t.id === id ? t.done : placed(t))).findIndex((t) => t.id === id);
    if (!sortable.current || from < 0 || to < 0) {
      release(id);
      return;
    }
    sortable.current.glide(from, to, () => release(id));
  }

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
    if (isAnytime(task)) hold(task.id, task.done, settle);
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

  function remove(task: Task) {
    const go = (scope: Scope) => {
      haptic('remove');
      release(task.id);
      const undo = deleteTask(task.id, scope);
      toast(scope === 'future' ? 'This and future tasks deleted' : 'Task deleted', { label: 'Undo', onPress: undo });
    };
    if (task.repeat) askScope('delete', { scheme: theme.scheme, tint: theme.accentText }, go);
    else go('this');
  }

  // The tab bar's add button makes a task on whichever day is showing.
  useAddAction('Add task', () => router.push({ pathname: '/task', params: { date: day } }));

  return (
    <Screen>
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
            {total > 0 ? (
              <Card style={styles.progress}>
                {/* "2 of 5 done" and the streak sit side by side until the
                  text is large enough that the streak would run off the
                  card, and then one goes under the other. */}
              <View style={[styles.progressTop, bigText && styles.progressTopStacked]}>
                  {allDone ? (
                    <DoneTitle title={title} celebrate={burst} />
                  ) : (
                    <Text style={{ color: theme.ink, fontSize: Type.sectionTitle, fontWeight: '600' }}>
                      {done} of {total} done
                    </Text>
                  )}
                  {days > 0 ? <Streak days={days} /> : null}
                </View>
                <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  {list.map((t) => (
                    <ProgressDot key={t.id} done={t.done} />
                  ))}
                  {moved.map((t) => (
                    <ProgressDot key={`moved-${t.id}`} done={false} />
                  ))}
                </View>
                {allDone ? <DotBurst id={burst} /> : null}
              </Card>
            ) : null}

            {total === 0 ? (
              <View style={{ marginTop: 14 }}>
                <Empty title="Nothing planned" body="Tap + above the tabs to add the first thing for this day." />
              </View>
            ) : (
              <>
                {timedList.length > 0 ? (
                  <>
                    <SectionHead title="Tasks" />
                    <Card>
                      {timedList.map((task, i) => (
                        <Animated.View key={task.id} layout={GLIDE} entering={FadeInDown.duration(220)} exiting={FadeOut.duration(160)}>
                          <TaskRow
                            task={task}
                            first={i === 0}
                            hour12={settings.hour12}
                            onToggle={() => toggle(task)}
                            onEdit={() => router.push({ pathname: '/task', params: { id: task.id } })}
                            onDelete={() => remove(task)}
                          />
                        </Animated.View>
                      ))}
                    </Card>
                  </>
                ) : null}
                {anytimeList.length > 0 ? (
                  <>
                    <SectionHead title="Anytime" />
                    <Card>
                      <Sortable
                        ref={sortable}
                        items={anytimeList}
                        fixedFrom={openAnytime.length}
                        onReorder={reorderTasks}
                        renderItem={(task, i, handle) => (
                          <TaskRow
                            task={task}
                            first={i === 0}
                            hour12={settings.hour12}
                            onToggle={() => toggle(task)}
                            onEdit={() => router.push({ pathname: '/task', params: { id: task.id } })}
                            onDelete={() => remove(task)}
                            handle={handle}
                            // Only open ones move; finished ones stay at the bottom.
                            moveActions={handle ? moveActions(i, openAnytime.length, openIds, reorderTasks) : []}
                          />
                        )}
                      />
                    </Card>
                  </>
                ) : null}
                {moved.length > 0 ? (
                  <>
                    <SectionHead title="Moved on" />
                    <Card>
                      {moved.map((task, i) => (
                        <MovedRow key={task.id} task={task} first={i === 0} />
                      ))}
                    </Card>
                  </>
                ) : null}
                <Text style={{ color: theme.ink3, fontSize: Type.footnote, textAlign: 'center', marginTop: 12 }}>
                  {openAnytime.length > 1
                    ? 'Swipe a task left to edit or delete it. Hold ≡ to drag.'
                    : 'Swipe a task left to edit or delete it.'}
                </Text>
              </>
            )}
          </Animated.View>
        </Animated.View>
      </LayoutAnimationConfig>
    </Screen>
  );
}

/**
 * A task that was left unfinished here and carried on: faded, with where it
 * went. Nothing to tick — it lives on the day it moved to.
 */
function MovedRow({ task, first }: { task: Task; first: boolean }) {
  const theme = useTheme();
  const to = formatDayShort(task.date).replace(/,/g, '');
  return (
    <View
      accessible
      accessibilityLabel={`${task.title}, not done this day, ${task.done ? 'finished on' : 'moved to'} ${formatDayLong(task.date)}`}
      style={[
        styles.moved,
        { backgroundColor: theme.card },
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
      ]}>
      <Icon name="arrow.turn.down.right" size={16} color={theme.ink3} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.ink2, fontSize: Type.body }}>{task.title}</Text>
        <Text style={{ color: theme.ink3, fontSize: Type.footnote, marginTop: 1 }}>
          {task.done ? `Done on ${to}` : `Moved to ${to}`}
        </Text>
      </View>
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
  moved: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10, paddingHorizontal: 16 },
});
