import { ColorPicker, Host } from '@expo/ui/swift-ui';
import { labelsHidden, opacity, scaleEffect } from '@expo/ui/swift-ui/modifiers';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useToast } from '@/components/toast';
import { Card, Icon, Row, Screen, SectionHead, Segmented } from '@/components/ui';
import { useStore } from '@/data/store';
import type { Settings } from '@/data/types';
import { splitTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useLock } from '@/lib/lock';
import { askPermission, permissionState, previewNudge, type PermissionState } from '@/lib/reminders';
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

const VERSION = Constants.expoConfig?.version ?? '';
const BUILD = Constants.expoConfig?.ios?.buildNumber ?? '';
const SUPPORT = 'support@clancyhq.com';
/** plancy has no licence of its own: it's sold under Apple's standard EULA, as most App Store apps are. */
const APPLE_EULA = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/** Mail, addressed and with the version in, so a support email says which build it's about. */
async function emailSupport() {
  haptic('select');
  const body = encodeURIComponent(`\n\n—\nplancy ${VERSION} (${BUILD}), iOS ${Platform.Version}`);
  try {
    await Linking.openURL(`mailto:${SUPPORT}?subject=${encodeURIComponent('plancy')}&body=${body}`);
  } catch {
    // No mail account on this iPhone.
    Alert.alert('Email us', `Write to ${SUPPORT} from any email app, and we'll get back to you.`);
  }
}

const LOCK_SCOPES: { value: Settings['lockScope']; label: string }[] = [
  { value: 'app', label: 'Whole app' },
  { value: 'private', label: 'Journal & Finance' },
];

const VOICES: { value: Settings['nudgeVoice']; label: string }[] = [
  { value: 'mix', label: 'Mix' },
  { value: 'warm', label: 'Warm' },
  { value: 'gentle', label: 'Gentle' },
  { value: 'playful', label: 'Playful' },
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

  /**
   * What iOS actually thinks, refreshed whenever plancy comes forward — the
   * person may have changed it in iPhone Settings while we were away.
   * Nothing here asks on its own; see the note in lib/reminders.ts.
   */
  const [notify, setNotify] = useState<PermissionState>('granted');
  const refreshNotify = useCallback(() => {
    void permissionState().then(setNotify);
  }, []);
  useEffect(() => {
    refreshNotify();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshNotify();
    });
    return () => sub.remove();
  }, [refreshNotify]);

  /**
   * Turning either switch on is the person asking for notifications, which is
   * the one moment plancy is allowed to spend iOS's single prompt.
   */
  async function setNotifySetting(key: 'remind' | 'nudge' | 'evening', on: boolean) {
    setSetting(key, on);
    if (!on) return;
    await askPermission();
    refreshNotify();
  }

  async function fixNotifications() {
    haptic('select');
    if (notify === 'ask') {
      await askPermission();
      refreshNotify();
    } else {
      await Linking.openSettings();
    }
  }

  async function sendPreview(which: 'morning' | 'evening') {
    haptic('select');
    const result = await previewNudge(tasks, settings, 5, which);
    if (result === 'sent') toast('Your nudge arrives in 5 seconds. Lock your phone to see it.');
    else if (result === 'empty') toast('Nothing is left open today, so tonight’s check-in wouldn’t come.');
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
        <Segmented
              label="Appearance"
              options={APPEARANCES}
              value={settings.appearance}
              onChange={(v) => setSetting('appearance', v)}
            />
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
        {/* Any colour at all, through the system picker. The circle is drawn
            like the other swatches (filled with the custom colour once there
            is one); the system's own colour well sits invisibly on top so a
            tap still opens Apple's picker. palette.ts keeps text readable
            whatever is chosen. */}
        <View
          accessible
          accessibilityRole="button"
          accessibilityState={{ selected: custom }}
          accessibilityLabel={custom ? `Custom colour ${settings.accent}` : 'Pick any colour'}
          style={[
            styles.swatch,
            styles.customSwatch,
            { backgroundColor: custom ? settings.accent : theme.fill },
            custom && { borderColor: theme.ink, borderWidth: 3 },
          ]}>
          <Icon name="eyedropper.halffull" size={18} color={custom ? theme.onAccent : theme.ink2} />
          <Host style={styles.customHost}>
            <ColorPicker
              selection={settings.accent}
              supportsOpacity={false}
              onSelectionChange={(hex) => {
                haptic('select');
                setSetting('accent', hex.slice(0, 7).toUpperCase());
              }}
              modifiers={[labelsHidden(), scaleEffect(1.8), opacity(0.02)]}
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

      <SectionHead title="Tasks" />
      <Card>
        <Row first>
          <Text style={{ flex: 1, color: theme.ink, fontSize: Type.body }}>Carry over unfinished tasks</Text>
          <Switch
            value={settings.carryOver}
            onValueChange={(on) => {
              haptic('select');
              setSetting('carryOver', on);
            }}
            trackColor={{ true: theme.accent }}
            accessibilityLabel="Carry over unfinished tasks"
          />
        </Row>
      </Card>
      <Text style={[styles.footnote, { color: theme.ink2 }]}>
        {settings.carryOver
          ? 'What’s left at midnight moves to the next day, at the top of Anytime. Repeating tasks stay put, and the day it left still counts as unfinished.'
          : 'Unfinished tasks stay on their day.'}
      </Text>

      <SectionHead title="Reminders" />
      {(settings.remind || settings.nudge || settings.evening) && notify !== 'granted' ? (
        <Card style={{ marginBottom: Space.gap }}>
          <Row
            first
            onPress={() => void fixNotifications()}
            accessibilityLabel={
              notify === 'ask'
                ? 'Allow notifications. plancy needs permission before reminders can arrive.'
                : 'Notifications are off for plancy. Opens iPhone Settings.'
            }>
            <Icon name="bell.badge" size={20} color={theme.warn} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.ink, fontSize: Type.body }}>
                {notify === 'ask' ? 'Allow notifications' : 'Notifications are off for plancy'}
              </Text>
              <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>
                {notify === 'ask'
                  ? 'Nothing will arrive until you do.'
                  : 'Turn them back on in iPhone Settings.'}
              </Text>
            </View>
            <Icon name="chevron.right" size={14} color={theme.ink3} />
          </Row>
        </Card>
      ) : null}
      <Card>
        <Row first>
          <Text style={{ flex: 1, color: theme.ink, fontSize: Type.body }}>Task reminders</Text>
          <Switch
            value={settings.remind}
            onValueChange={(on) => void setNotifySetting('remind', on)}
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

      <SectionHead title="Nudges" />
      <Card>
        <Row first>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.ink, fontSize: Type.body }}>Morning nudge</Text>
            <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>Today's plan and your streak, once a day</Text>
          </View>
          <Switch
            value={settings.nudge}
            onValueChange={(on) => void setNotifySetting('nudge', on)}
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
          <Row onPress={() => void sendPreview('morning')} accessibilityLabel="Send a preview of the morning nudge">
            <Text style={{ flex: 1, color: theme.accentText, fontSize: Type.body }}>Send a preview</Text>
          </Row>
        ) : null}
      </Card>
      <Card style={{ marginTop: Space.gap }}>
        <Row first>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.ink, fontSize: Type.body }}>Evening check-in</Text>
            <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>Only when something is still open</Text>
          </View>
          <Switch
            value={settings.evening}
            onValueChange={(on) => void setNotifySetting('evening', on)}
            trackColor={{ true: theme.accent }}
            accessibilityLabel="Evening check-in"
          />
        </Row>
        {settings.evening ? (
          <Row>
            <Text style={{ flex: 1, color: theme.ink, fontSize: Type.body }}>At</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${nudgeLabel(settings.eveningHour, settings.hour12)}, tap to change`}
              onPress={() => {
                const hours = [18, 19, 20, 21, 22];
                haptic('select');
                setSetting('eveningHour', hours[(hours.indexOf(settings.eveningHour) + 1) % hours.length]);
              }}>
              <Text style={{ color: theme.accentText, fontSize: Type.body }}>{nudgeLabel(settings.eveningHour, settings.hour12)}</Text>
            </Pressable>
          </Row>
        ) : null}
        {settings.evening ? (
          <Row onPress={() => void sendPreview('evening')} accessibilityLabel="Send a preview of the evening check-in">
            <Text style={{ flex: 1, color: theme.accentText, fontSize: Type.body }}>Send a preview</Text>
          </Row>
        ) : null}
      </Card>
      {settings.nudge || settings.evening ? (
        <Card style={{ marginTop: Space.gap, padding: 12, gap: 10 }}>
          <Text style={{ color: theme.ink, fontSize: Type.body, paddingHorizontal: 4 }}>Voice</Text>
          <Segmented label="Nudge voice" options={VOICES} value={settings.nudgeVoice} onChange={(v) => setSetting('nudgeVoice', v)} />
        </Card>
      ) : null}
      <Text style={[styles.footnote, { color: theme.ink2 }]}>
        Mondays add last week's tally, the 1st adds last month's. Mix takes turns with the other three voices, a day each.
      </Text>

      <SectionHead title="Widget" />
      <Card style={{ padding: 12 }}>
        <Segmented
              label="Widget style"
              options={WIDGET_STYLES}
              value={settings.widgetStyle}
              onChange={(v) => setSetting('widgetStyle', v)}
            />
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
            <Segmented
              label="What Face ID locks"
              options={LOCK_SCOPES}
              value={settings.lockScope}
              onChange={(v) => setSetting('lockScope', v)}
            />
          </View>
        ) : null}
      </Card>
      <Text style={[styles.footnote, { color: theme.ink2 }]}>
        {settings.lockEnabled
          ? settings.lockScope === 'app'
            ? `plancy asks for ${lock.method} when it opens and whenever you come back to it.`
            : `Journal and Finance ask for ${lock.method} before they show anything. Today and Ideas stay open.`
          : 'Everything stays on this iPhone, and in your own backups. Nobody at Clancy can see it.'}
      </Text>

      <SectionHead title="About" />
      <Card>
        <Row first onPress={() => router.push('/privacy')} accessibilityLabel="Privacy policy">
          <Text style={{ flex: 1, color: theme.ink, fontSize: Type.body }}>Privacy policy</Text>
          <Icon name="chevron.right" size={14} color={theme.ink3} />
        </Row>
        <Row onPress={() => void Linking.openURL(APPLE_EULA)} accessibilityLabel="Terms of use. Opens Apple's website.">
          <Text style={{ flex: 1, color: theme.ink, fontSize: Type.body }}>Terms of use</Text>
          <Icon name="arrow.up.right" size={14} color={theme.ink3} />
        </Row>
        <Row onPress={() => void emailSupport()} accessibilityLabel={`Contact support. Emails ${SUPPORT}.`}>
          <Text style={{ flex: 1, color: theme.ink, fontSize: Type.body }}>Contact support</Text>
          <Icon name="envelope" size={16} color={theme.ink3} />
        </Row>
        <Row onPress={() => router.push('/licences')} accessibilityLabel="Open-source licences">
          <Text style={{ flex: 1, color: theme.ink, fontSize: Type.body }}>Open-source licences</Text>
          <Icon name="chevron.right" size={14} color={theme.ink3} />
        </Row>
      </Card>
      <Text style={[styles.footnote, { color: theme.ink2 }]}>
        plancy {VERSION} ({BUILD}) · © 2026 Clancy Sdn Bhd. Sold under Apple's standard licence for App Store apps.
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
  customSwatch: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  customHost: { position: 'absolute', top: 0, left: 0, width: 44, height: 44 },
  footnote: { fontSize: Type.footnote, marginTop: 7, marginHorizontal: Space.gutter },
  about: { alignItems: 'center', gap: 4, marginTop: 28 },
});
