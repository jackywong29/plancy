import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BigTitle, Card, Empty, Icon, Row, Screen, SectionHead } from '@/components/ui';
import { useStore } from '@/data/store';
import type { Mood } from '@/data/types';
import { addDays, formatDayLong, formatDayShort, todayIso } from '@/lib/format';
import { Space, Type, useTheme } from '@/theme/theme';

const MOODS: { key: Mood; label: string; size: number }[] = [
  { key: 'great', label: 'Great', size: 16 },
  { key: 'good', label: 'Good', size: 13 },
  { key: 'okay', label: 'Okay', size: 10 },
  { key: 'low', label: 'Low', size: 8 },
  { key: 'rough', label: 'Rough', size: 6 },
];

export default function JournalScreen() {
  const { journal, writeJournal } = useStore();
  const theme = useTheme();
  const today = todayIso();
  const [date, setDate] = useState(today);
  const entry = journal.find((e) => e.date === date);
  const [body, setBody] = useState(entry?.body ?? '');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Opening another day loads that day's text; it must not carry over.
  useEffect(() => {
    setBody(journal.find((e) => e.date === date)?.body ?? '');
  }, [date, journal]);

  function onChange(text: string) {
    setBody(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => writeJournal(date, { body: text }), 600);
  }

  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  const isToday = date === today;
  const past = journal.filter((e) => e.body.trim());

  return (
    <Screen>
      <BigTitle subtitle={`${past.length} ${past.length === 1 ? 'entry' : 'entries'} so far`}>journal</BigTitle>

      <Card style={styles.datePill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          onPress={() => setDate(addDays(date, -1))}
          style={styles.arrow}>
          <Icon name="chevron.left" size={20} color={theme.accentText} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: theme.ink, fontSize: Type.body, fontWeight: '600' }}>
            {isToday ? 'Today' : formatDayShort(date)}
          </Text>
          <Text style={{ color: theme.ink2, fontSize: Type.caption }}>{formatDayLong(date)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next day"
          disabled={isToday}
          onPress={() => setDate(addDays(date, 1))}
          style={styles.arrow}>
          <Icon name="chevron.right" size={20} color={isToday ? theme.ink3 : theme.accentText} />
        </Pressable>
      </Card>

      {/* One stray tap files an entry under the wrong day, so say it plainly. */}
      {!isToday ? (
        <View style={[styles.warn, { backgroundColor: theme.warnSoft }]}>
          <Icon name="exclamationmark.triangle" size={18} color={theme.warn} />
          <Text style={{ flex: 1, color: theme.ink, fontSize: Type.footnote }}>
            You are writing in {formatDayShort(date)}, not today.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setDate(today)}>
            <Text style={{ color: theme.warn, fontWeight: '600', fontSize: Type.footnote }}>Back to today</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.moods}>
        {MOODS.map((m) => {
          const selected = entry?.mood === m.key;
          return (
            <Pressable
              key={m.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={m.label}
              onPress={() => writeJournal(date, { mood: selected ? '' : m.key })}
              style={[
                styles.mood,
                { backgroundColor: theme.card },
                selected && { borderColor: theme.accent, borderWidth: 2 },
              ]}>
              <View
                style={{
                  width: m.size,
                  height: m.size,
                  borderRadius: m.size / 2,
                  backgroundColor: selected ? theme.accent : theme.ink3,
                  opacity: selected ? 1 : 0.45,
                }}
              />
              <Text style={{ color: selected ? theme.ink : theme.ink2, fontSize: Type.caption, fontWeight: selected ? '600' : '500' }}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card style={{ padding: Space.gutter }}>
        <TextInput
          value={body}
          onChangeText={onChange}
          onBlur={() => writeJournal(date, { body })}
          multiline
          textAlignVertical="top"
          placeholder="How did the day go? What happened, what mattered, what is on your mind?"
          placeholderTextColor={theme.ink3}
          accessibilityLabel="Journal entry"
          style={{ color: theme.ink, fontSize: Type.sectionTitle, lineHeight: 25, minHeight: 200 }}
        />
        <View style={[styles.editorFoot, { borderTopColor: theme.line }]}>
          <Text style={{ color: theme.ink2, fontSize: Type.caption }}>{words} words</Text>
          <Text style={{ color: theme.ink2, fontSize: Type.caption }}>Saves as you type</Text>
        </View>
      </Card>

      <SectionHead title="Past entries" />
      {past.length === 0 ? (
        <Empty title="No entries yet" body="Write a line about today. Tomorrow it will be worth having." />
      ) : (
        <Card>
          {past.map((e, i) => (
            <Row key={e.id} first={i === 0} onPress={() => setDate(e.date)} accessibilityLabel={`Open ${formatDayLong(e.date)}`}>
              <View style={{ width: 44, alignItems: 'center' }}>
                <Text style={{ color: theme.ink, fontFamily: Type.display, fontSize: 22 }}>
                  {Number(e.date.slice(8))}
                </Text>
                <Text style={{ color: theme.ink2, fontSize: 11 }}>{formatDayShort(e.date).split(' ')[0]}</Text>
              </View>
              <Text numberOfLines={2} style={{ flex: 1, color: theme.ink2, fontSize: Type.footnote }}>
                {e.body}
              </Text>
              {e.mood ? (
                <View
                  style={{
                    width: MOODS.find((m) => m.key === e.mood)?.size ?? 8,
                    height: MOODS.find((m) => m.key === e.mood)?.size ?? 8,
                    borderRadius: 8,
                    backgroundColor: theme.accent,
                  }}
                />
              ) : null}
            </Row>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  datePill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 4, marginBottom: 10 },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 12, marginBottom: 10 },
  moods: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  mood: { flex: 1, borderRadius: 12, paddingVertical: 9, alignItems: 'center', gap: 5, borderWidth: 2, borderColor: 'transparent' },
  editorFoot: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, marginTop: 8 },
});
