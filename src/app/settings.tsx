import { ColorPicker, Host } from '@expo/ui/swift-ui';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useToast } from '@/components/toast';
import { Card, Row, Screen, SectionHead } from '@/components/ui';
import { useStore } from '@/data/store';
import type { Settings } from '@/data/types';
import { splitTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useLock } from '@/lib/lock';
import { previewNudge } from '@/lib/reminders';
import { PALETTE } from '@/theme/palette';
import { Space, Type, useTheme } from '@/theme/theme';

/**
 * Sample data and erase, for trying the app out. In development and in the
 * build on Jacky's own iPhone (app.config.js sets testTools), never in the
 * App Store build.
 */
const TEST_TOOLS = __DEV__ || Constants.expoConfig?.extra?.testTools === true;

function nudgeLabel(hour: number, hour12: boolean): string {
  const { time, suffix } = splitTime(`${String(hour).padStart(2, '0')}:00`, hour12);
  return `${time} ${suffix}`.trim();
}

const LOCK_SCOPES: { value: Settings['lockScope']; label: string }[] = [
  { value: 'app', label: 'Whole app' },
  { value: 'private', label: 'Journal & Finance' },
];

const WIDGET_STYLES: { value: Settings['widgetStyle']; label: string }[] = [
  { value: 'progress', label: 'Progress' },
  { value: 'streak', label: 'Streak' },
  { value: 'tasks', label: 'Tasks' },
];

const APPEARANCES: { value: Settings['appearance']; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const { settings, setSetting, resetData, tasks } = useStore();
  const toast = useToast();
  const params = useLocalSearchParams<{ preview?: string }>();
  const theme = useTheme();
  const router = useRouter();
  const lock = useLock();

  async function sendPreview() {
    haptic('select');
    const ok = await previewNudge(tasks, settings);
    if (ok) toast('Your nudge arrives in 5 seconds. Lock your phone to see it.');
    else toast('Notifications are off for plancy in iPhone Settings.');
  }

  // Test builds: plancy://settings?preview=nudge-<anything> sends one in 3
  // seconds. Each distinct value sends once, so a test can repeat it.
  const previewed = useRef<string | null>(null);
  useEffect(() => {
    if (!TEST_TOOLS || !params.preview?.startsWith('nudge') || previewed.current === params.preview) return;
    previewed.current = params.preview;
    void previewNudge(tasks, settings, 3);
  }, [params.preview, tasks, settings]);
  const custom = !PALETTE.some((s) => s.hex === settings.accent);

  return (
    <Screen bottomInset={40}>
      <SectionHead title="Appearance" />
      <Card style={{ padding: 12 }}>
        <View style={[styles.segment, { backgroundColor: theme.fill }]}>
          {APPEARANCES.map((a) => {
            const selected = settings.appearance === a.value;
            return (
              <Pressable
                key={a.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  if (!selected) haptic('select');
                  setSetting('appearance', a.value);
                }}
                style={[styles.segmentItem, selected && { backgroundColor: theme.card }]}>
                <Text style={{ color: theme.ink, fontSize: Type.callout, fontWeight: selected ? '600' : '500' }}>
                  {a.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <SectionHead title="Colour" />
      <Card style={styles.swatches}>
        {PALETTE.map((swatch) => {
          const selected = settings.accent === swatch.hex;
          return (
            <Pressable
              key={swatch.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={swatch.name}
              onPress={() => {
                if (!selected) haptic('select');
                setSetting('accent', swatch.hex);
              }}
              style={[
                styles.swatch,
                { backgroundColor: swatch.hex },
                selected && { borderColor: theme.ink, borderWidth: 3 },
              ]}
            />
          );
        })}
        {/* Any colour at all, through the system picker. The contrast maths in
            palette.ts keeps text readable whatever is chosen. */}
        <View
          accessibilityLabel={custom ? `Custom colour ${settings.accent}, selected` : 'Custom colour'}
          style={[styles.swatch, styles.customSwatch, { borderColor: custom ? theme.ink : theme.line, backgroundColor: theme.fill }]}>
          <Host style={styles.customHost}>
            <ColorPicker
              selection={settings.accent}
              supportsOpacity={false}
              onSelectionChange={(hex) => setSetting('accent', hex.slice(0, 7).toUpperCase())}
            />
          </Host>
        </View>
      </Card>
      <Text style={[styles.footnote, { color: theme.ink2 }]}>
        Used for ticks, the selected day, progress dots and buttons. The last circle opens a picker for any colour.
      </Text>

      <SectionHead title="Region" />
      <Card>
        <Row first onPress={() => router.push('/currency')} accessibilityLabel={`Currency, ${settings.currency}, tap to change`}>
          <Text style={{ flex: 1, color: theme.ink, fontSize: Type.body }}>Currency</Text>
          <Text style={{ color: theme.accentText, fontSize: Type.body }}>{settings.currency}</Text>
        </Row>
        <Row>
          <Text style={{ flex: 1, color: theme.ink, fontSize: Type.body }}>Week starts on</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Week starts on ${settings.weekStart === 1 ? 'Monday' : 'Sunday'}, tap to change`}
            onPress={() => {
              haptic('select');
              setSetting('weekStart', settings.weekStart === 1 ? 7 : 1);
            }}>
            <Text style={{ color: theme.accentText, fontSize: Type.body }}>
              {settings.weekStart === 1 ? 'Monday' : 'Sunday'}
            </Text>
          </Pressable>
        </Row>
        <Row>
          <Text style={{ flex: 1, color: theme.ink, fontSize: Type.body }}>24-hour time</Text>
          <Switch
            value={!settings.hour12}
            onValueChange={(on) => setSetting('hour12', !on)}
            trackColor={{ true: theme.accent }}
            accessibilityLabel="24-hour time"
          />
        </Row>
      </Card>

      <SectionHead title="Reminders" />
      <Card>
        <Row first>
          <Text style={{ flex: 1, color: theme.ink, fontSize: Type.body }}>Task reminders</Text>
          <Switch
            value={settings.remind}
            onValueChange={(on) => setSetting('remind', on)}
            trackColor={{ true: theme.accent }}
            accessibilityLabel="Task reminders"
          />
        </Row>
        <Row>
          <Text style={{ flex: 1, color: theme.ink, fontSize: Type.body }}>Remind me</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${settings.leadMinutes} minutes before, tap to change`}
            onPress={() => {
              const steps = [0, 5, 10, 30, 60];
              const next = steps[(steps.indexOf(settings.leadMinutes) + 1) % steps.length];
              haptic('select');
              setSetting('leadMinutes', next);
            }}>
            <Text style={{ color: theme.accentText, fontSize: Type.body }}>
              {settings.leadMinutes === 0 ? 'At the time' : `${settings.leadMinutes} min before`}
            </Text>
          </Pressable>
        </Row>
      </Card>
      <Text style={[styles.footnote, { color: theme.ink2 }]}>
        Reminders are scheduled on this iPhone, so they arrive with no internet.
      </Text>

      <SectionHead title="Morning nudge" />
      <Card>
        <Row first>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.ink, fontSize: Type.body }}>Morning nudge</Text>
            <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>Today's plan and your streak, once a day</Text>
          </View>
          <Switch
            value={settings.nudge}
            onValueChange={(on) => setSetting('nudge', on)}
            trackColor={{ true: theme.accent }}
            accessibilityLabel="Morning nudge"
          />
        </Row>
        {settings.nudge ? (
          <Row>
            <Text style={{ flex: 1, color: theme.ink, fontSize: Type.body }}>At</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${nudgeLabel(settings.nudgeHour, settings.hour12)}, tap to change`}
              onPress={() => {
                const hours = [6, 7, 8, 9, 10];
                haptic('select');
                setSetting('nudgeHour', hours[(hours.indexOf(settings.nudgeHour) + 1) % hours.length]);
              }}>
              <Text style={{ color: theme.accentText, fontSize: Type.body }}>{nudgeLabel(settings.nudgeHour, settings.hour12)}</Text>
            </Pressable>
          </Row>
        ) : null}
        {settings.nudge ? (
          <Row onPress={() => void sendPreview()} accessibilityLabel="Send a preview of the morning nudge">
            <Text style={{ flex: 1, color: theme.accentText, fontSize: Type.body }}>Send a preview</Text>
          </Row>
        ) : null}
      </Card>
      <Text style={[styles.footnote, { color: theme.ink2 }]}>
        Mondays add last week's tally, the 1st adds last month's. Turn it off here any time.
      </Text>

      <SectionHead title="Widget" />
      <Card style={{ padding: 12 }}>
        <View style={[styles.segment, { backgroundColor: theme.fill }]}>
          {WIDGET_STYLES.map((w) => {
            const selected = settings.widgetStyle === w.value;
            return (
              <Pressable
                key={w.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  if (!selected) haptic('select');
                  setSetting('widgetStyle', w.value);
                }}
                style={[styles.segmentItem, selected && { backgroundColor: theme.card }]}>
                <Text style={{ color: theme.ink, fontSize: Type.callout, fontWeight: selected ? '600' : '500' }}>{w.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
      <Text style={[styles.footnote, { color: theme.ink2 }]}>
        What the small widget shows. The wider one adds your next tasks beside it. Add it from the home screen: hold down, tap +, search plancy.
      </Text>

      <SectionHead title="Feel" />
      <Card>
        <Row first>
          <Text style={{ flex: 1, color: theme.ink, fontSize: Type.body }}>Haptics</Text>
          <Switch
            value={settings.haptics}
            onValueChange={(on) => setSetting('haptics', on)}
            trackColor={{ true: theme.accent }}
            accessibilityLabel="Haptics"
          />
        </Row>
      </Card>
      <Text style={[styles.footnote, { color: theme.ink2 }]}>Taps when you tick things off, and a little more when you finish the day.</Text>

      <SectionHead title="Privacy" />
      <Card>
        <Row first>
          <Text style={{ flex: 1, color: theme.ink, fontSize: Type.body }}>Lock with {lock.method}</Text>
          <Switch
            value={settings.lockEnabled}
            onValueChange={(on) => void lock.setEnabled(on)}
            trackColor={{ true: theme.accent }}
            accessibilityLabel={`Lock with ${lock.method}`}
          />
        </Row>
        {settings.lockEnabled ? (
          <View style={{ padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line }}>
            <View style={[styles.segment, { backgroundColor: theme.fill }]}>
              {LOCK_SCOPES.map((o) => {
                const selected = settings.lockScope === o.value;
                return (
                  <Pressable
                    key={o.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      if (selected) return;
                      haptic('select');
                      void lock.setScope(o.value);
                    }}
                    style={[styles.segmentItem, selected && { backgroundColor: theme.card }]}>
                    <Text style={{ color: theme.ink, fontSize: Type.callout, fontWeight: selected ? '600' : '500' }}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </Card>
      <Text style={[styles.footnote, { color: theme.ink2 }]}>
        {settings.lockEnabled
          ? settings.lockScope === 'app'
            ? `plancy asks for ${lock.method} when it opens and whenever you come back to it.`
            : `Journal and Finance ask for ${lock.method} before they show anything. Today and Ideas stay open.`
          : 'Your data stays on your devices and in your own iCloud. Nobody at Clancy can see it.'}
      </Text>

      {TEST_TOOLS ? (
        <>
          <SectionHead title="Testing" />
          <Card>
            <Row
              first
              accessibilityLabel="Load sample data"
              onPress={() =>
                Alert.alert(
                  'Replace your data with sample data?',
                  'Your tasks, journal, ideas and finance entries on this iPhone are erased first.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Replace', style: 'destructive', onPress: () => resetData(true) },
                  ],
                )
              }>
              <Text style={{ flex: 1, color: theme.accentText, fontSize: Type.body }}>Load sample data</Text>
            </Row>
            <Row
              accessibilityLabel="Erase all data"
              onPress={() =>
                Alert.alert('Erase all data?', 'Tasks, journal, ideas and finance entries on this iPhone are deleted. Settings stay.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Erase', style: 'destructive', onPress: () => resetData(false) },
                ])
              }>
              <Text style={{ flex: 1, color: theme.bad, fontSize: Type.body }}>Erase all data</Text>
            </Row>
          </Card>
          <Text style={[styles.footnote, { color: theme.ink2 }]}>Only in test builds, not in the App Store version.</Text>
        </>
      ) : null}

      <View style={styles.about}>
        <Text style={{ color: theme.ink2, fontFamily: Type.display, fontSize: 16 }}>
          made by clancy<Text style={{ color: theme.accent }}>.</Text>
        </Text>
        <Text style={{ color: theme.ink3, fontSize: Type.footnote }}>plancy 1.0, development build</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', borderRadius: 9, padding: 2 },
  segmentItem: { flex: 1, paddingVertical: 7, borderRadius: 7, alignItems: 'center' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, padding: Space.gutter },
  swatch: { width: 44, height: 44, borderRadius: 22 },
  customSwatch: { borderWidth: 3, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  customHost: { width: 44, height: 44 },
  footnote: { fontSize: Type.footnote, marginTop: 7, marginHorizontal: Space.gutter },
  about: { alignItems: 'center', gap: 4, marginTop: 28 },
});
