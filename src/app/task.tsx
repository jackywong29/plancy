/**
 * New task / edit task, as a sheet.
 *
 * Opened with `?date=YYYY-MM-DD` for a new task on that day, or `?id=…` to
 * edit. The time wheel is the real iOS one, through Expo UI.
 */
import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, labelsHidden } from '@expo/ui/swift-ui/modifiers';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Card, Chip, Row, SectionHead } from '@/components/ui';
import { useStore } from '@/data/store';
import type { Repeat } from '@/data/types';
import { addDays, formatDayShort, fromIso, isoDate, todayIso } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { Space, Type, useTheme } from '@/theme/theme';

const REPEATS: { value: Repeat; label: string }[] = [
  { value: '', label: 'Never' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function TaskSheet() {
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { tasks, settings, addTask, editTask, moveTask } = useStore();

  const existing = params.id ? tasks.find((t) => t.id === params.id) : undefined;
  const today = todayIso();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.date ?? params.date ?? today);
  const [when, setWhen] = useState<Date>(() => {
    const d = new Date();
    if (existing) {
      const [h, m] = existing.time.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    } else {
      d.setSeconds(0, 0);
      d.setMinutes(d.getMinutes() <= 30 ? 30 : 60);
    }
    return d;
  });
  const [repeat, setRepeat] = useState<Repeat>(existing?.repeat ?? '');
  const [remind, setRemind] = useState(settings.remind);
  const [pickingDay, setPickingDay] = useState(false);

  const canSave = title.trim().length > 0;

  function save() {
    if (!canSave) return;
    const time = `${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
    if (existing) {
      editTask(existing.id, { title: title.trim(), time, repeat });
      if (date !== existing.date) moveTask(existing.id, date);
    } else {
      addTask({ date, time, title: title.trim(), repeat });
    }
    haptic('saved');
    router.back();
  }

  const dayChips: { label: string; value: string }[] = [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
    { label: formatDayShort(addDays(today, 2)).split(' ').slice(0, 2).join(' '), value: addDays(today, 2) },
  ];
  const dayIsCustom = !dayChips.some((c) => c.value === date);

  return (
    <View style={{ flex: 1, backgroundColor: theme.ground }}>
      <Stack.Screen
        options={{
          title: existing ? 'Edit task' : 'New task',
          // Native bar buttons, so iOS draws their glass for the current
          // appearance: close on the left, confirm on the right, as in iOS 26.
          unstable_headerLeftItems: () => [
            { type: 'button', label: 'Cancel', icon: { type: 'sfSymbol', name: 'xmark' }, onPress: () => router.back() },
          ],
          unstable_headerRightItems: () => [
            {
              type: 'button',
              label: existing ? 'Save' : 'Add',
              accessibilityLabel: existing ? 'Save task' : 'Add task',
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
        <Card>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What do you need to do?"
            placeholderTextColor={theme.ink3}
            keyboardAppearance={theme.scheme}
            autoFocus={!existing}
            returnKeyType="done"
            onSubmitEditing={save}
            accessibilityLabel="Task name"
            style={{ color: theme.ink, fontSize: 17, paddingVertical: 14, paddingHorizontal: Space.gutter }}
          />
        </Card>

        <SectionHead title="Day" />
        <Card style={styles.chips}>
          {dayChips.map((c) => (
            <Chip key={c.value} label={c.label} selected={date === c.value} onPress={() => setDate(c.value)} />
          ))}
          <Chip
            label={dayIsCustom ? formatDayShort(date) : 'Pick a day'}
            selected={dayIsCustom}
            onPress={() => setPickingDay((v) => !v)}
          />
        </Card>
        {pickingDay ? (
          <Card style={{ marginTop: 8, padding: 8 }}>
            <Host matchContents>
              <DatePicker
                selection={fromIso(date)}
                displayedComponents={['date']}
                onDateChange={(d) => setDate(isoDate(d))}
                modifiers={[datePickerStyle('graphical'), labelsHidden()]}
              />
            </Host>
          </Card>
        ) : null}

        <SectionHead title="Time" />
        <Card style={{ paddingVertical: 4 }}>
          <Host matchContents>
            <DatePicker
              selection={when}
              displayedComponents={['hourAndMinute']}
              onDateChange={setWhen}
              modifiers={[datePickerStyle('wheel'), labelsHidden()]}
            />
          </Host>
        </Card>

        <SectionHead title="Repeat" />
        <Card style={{ padding: 12 }}>
          <View style={[styles.segment, { backgroundColor: theme.fill }]}>
            {REPEATS.map((r) => {
              const selected = repeat === r.value;
              return (
                <Pressable
                  key={r.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setRepeat(r.value)}
                  style={[styles.segmentItem, selected && { backgroundColor: theme.card }]}>
                  <Text style={{ color: theme.ink, fontSize: Type.callout, fontWeight: selected ? '600' : '500' }}>
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={{ marginTop: 20 }}>
          <Row first>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.ink, fontSize: Type.body }}>Remind me</Text>
              <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>
                {settings.leadMinutes === 0 ? 'At the time' : `${settings.leadMinutes} minutes before`}
              </Text>
            </View>
            <Switch value={remind} onValueChange={setRemind} trackColor={{ true: theme.accent }} accessibilityLabel="Remind me" />
          </Row>
        </Card>
        <Text style={{ color: theme.ink2, fontSize: Type.footnote, marginTop: 7, marginHorizontal: Space.gutter }}>
          Reminders are scheduled on this iPhone, so they arrive with no internet.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  segment: { flexDirection: 'row', borderRadius: 9, padding: 2 },
  segmentItem: { flex: 1, paddingVertical: 7, borderRadius: 7, alignItems: 'center' },
});
