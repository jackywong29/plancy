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

import { askScope } from '@/components/scope-sheet';
import { Card, Chip, Row, SectionHead, Segmented } from '@/components/ui';
import { useStore, type Scope } from '@/data/store';
import type { Repeat } from '@/data/types';
import { addDays, formatDayShort, fromIso, isoDate } from '@/lib/format';
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
  const { tasks, today, settings, addTask, editTask } = useStore();

  const existing = params.id ? tasks.find((t) => t.id === params.id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [date, setDate] = useState(existing?.date ?? params.date ?? today);
  // Off makes it an anytime task: no time, no reminder, and a place in the
  // list below the timed tasks that the person sets by dragging.
  const [timed, setTimed] = useState(existing ? existing.time !== '' : true);
  const [when, setWhen] = useState<Date>(() => {
    const d = new Date();
    if (existing && existing.time !== '') {
      const [h, m] = existing.time.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    } else {
      d.setSeconds(0, 0);
      d.setMinutes(d.getMinutes() <= 30 ? 30 : 60);
    }
    return d;
  });
  const [repeat, setRepeat] = useState<Repeat>(existing?.repeat ?? '');
  // Per task. A new one starts on when Settings → Task reminders is on.
  const [remind, setRemind] = useState(existing ? existing.remind : settings.remind);
  const [pickingDay, setPickingDay] = useState(false);

  const canSave = title.trim().length > 0;

  function save() {
    if (!canSave) return;
    const time = timed ? `${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}` : '';
    const fields = { date, time, title: title.trim(), notes: notes.trim(), remind, repeat };
    if (existing && (Object.keys(fields) as (keyof typeof fields)[]).every((k) => fields[k] === existing[k])) {
      router.back();
      return;
    }
    const done = (scope?: Scope) => {
      if (existing) editTask(existing.id, fields, scope);
      else addTask(fields);
      haptic('saved');
      router.back();
    };
    // A copy of a repeating task asks how far the edit reaches, as Calendar
    // does. A new repeat rule always starts from this copy, so that needn't ask.
    const asks = existing && existing.repeat !== '' && repeat === existing.repeat;
    if (asks) askScope('save', { scheme: theme.scheme, tint: theme.accentText }, done);
    else done();
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
            style={{ color: theme.ink, fontSize: Type.sectionTitle, paddingVertical: 14, paddingHorizontal: Space.gutter }}
          />
          {/* Notes share the title's card, the way Reminders keeps them
              together: one thing, with its details underneath. */}
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.line, marginLeft: Space.gutter }} />
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes"
            placeholderTextColor={theme.ink3}
            keyboardAppearance={theme.scheme}
            multiline
            scrollEnabled={false}
            accessibilityLabel="Notes"
            accessibilityHint="Details for this task"
            style={{
              color: theme.ink,
              fontSize: Type.body,
              minHeight: 88,
              paddingTop: 12,
              paddingBottom: 14,
              paddingHorizontal: Space.gutter,
              textAlignVertical: 'top',
            }}
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
        <Card>
          <Row first>
            <Text style={{ flex: 1, color: theme.ink, fontSize: Type.body }}>Set a time</Text>
            <Switch
              value={timed}
              onValueChange={(on) => {
                haptic('select');
                setTimed(on);
              }}
              trackColor={{ true: theme.accent }}
              accessibilityLabel="Set a time"
            />
          </Row>
          {timed ? (
            <View style={{ paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line }}>
              <Host matchContents>
                <DatePicker
                  selection={when}
                  displayedComponents={['hourAndMinute']}
                  onDateChange={setWhen}
                  modifiers={[datePickerStyle('wheel'), labelsHidden()]}
                />
              </Host>
            </View>
          ) : null}
        </Card>
        {!timed ? (
          <Text style={{ color: theme.ink2, fontSize: Type.footnote, marginTop: 7, marginHorizontal: Space.gutter }}>
            Anytime tasks sit under the timed ones. Drag them into the order you want.
          </Text>
        ) : null}

        <SectionHead title="Repeat" />
        <Card style={{ padding: 12 }}>
          <Segmented label="Repeat" options={REPEATS} value={repeat} onChange={setRepeat} />
        </Card>

        {/* An anytime task has no time to be reminded at. */}
        {timed ? (
          <>
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
            {settings.remind
            ? 'Reminders are scheduled on this iPhone, so they arrive with no internet.'
            : 'Task reminders are off in Settings, so none will arrive until you turn them on there.'}
          </Text>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
});
