/**
 * The first four screens, shown once.
 *
 * The order is deliberate. What plancy is comes first, because nobody grants a
 * permission to an app they can't describe yet. Colour comes second: it costs
 * nothing, it's the most immediately pleasing thing plancy does, and the app
 * feels like the reader's before they have typed a word. The two notification
 * asks come last and stay apart — iOS gives an app exactly one permission
 * prompt, so it is spent here, with the reason already on screen, and never at
 * launch. The morning nudge gets a screen of its own and starts off: App
 * Review treats habit nudges as marketing, and bundling one into the reminder
 * ask is the shape that gets flagged.
 */
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Icon, Segmented } from '@/components/ui';
import type { Settings } from '@/data/types';
import { haptic } from '@/lib/haptics';
import { askPermission } from '@/lib/reminders';
import { PALETTE } from '@/theme/palette';
import { Space, Type, useTheme } from '@/theme/theme';

const WHAT: { icon: Parameters<typeof Icon>[0]['name']; title: string; body: string }[] = [
  { icon: 'calendar', title: 'today', body: 'What you planned, and what you got done.' },
  { icon: 'book.closed', title: 'journal', body: 'A line about how the day went. One a day.' },
  { icon: 'lightbulb', title: 'ideas', body: 'Somewhere to put a thought before it escapes.' },
  { icon: 'creditcard', title: 'finance', body: 'What came in, what went out, what is left.' },
];

const APPEARANCES: { value: Settings['appearance']; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function Onboarding({
  settings,
  setSetting,
}: {
  settings: Settings;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}) {
  const theme = useTheme();
  const [step, setStep] = useState(0);
  const next = () => {
    haptic('select');
    setStep((s) => s + 1);
  };
  const finish = () => {
    haptic('saved');
    setSetting('onboarded', true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.ground }}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Animated.View key={step} entering={FadeIn.duration(260)} exiting={FadeOut.duration(140)} style={{ flex: 1 }}>
        {step === 0 ? (
          <Step
            title="plancy"
            lead="Four things, one day."
            primary="Get started"
            onPrimary={next}>
            {WHAT.map((w) => (
              <View key={w.title} style={styles.item}>
                <View style={[styles.bullet, { backgroundColor: theme.accentSoft }]}>
                  <Icon name={w.icon} size={19} color={theme.accentText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.ink, fontSize: Type.body, fontWeight: '600' }}>{w.title}</Text>
                  <Text style={{ color: theme.ink2, fontSize: Type.callout }}>{w.body}</Text>
                </View>
              </View>
            ))}
            <Text style={{ color: theme.ink2, fontSize: Type.callout, marginTop: 20 }}>
              No account, and no sign-up. Everything stays on this iPhone — plancy has no server to
              send it to.
            </Text>
          </Step>
        ) : null}

        {step === 1 ? (
          <Step title="make it yours" lead="Pick a colour. You can change it whenever you like." primary="Continue" onPrimary={next}>
            <View style={styles.swatches}>
              {PALETTE.map((s) => {
                const on = settings.accent.toLowerCase() === s.hex.toLowerCase();
                return (
                  <Pressable
                    key={s.id}
                    accessibilityRole="button"
                    accessibilityLabel={s.name}
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      haptic('select');
                      setSetting('accent', s.hex);
                    }}
                    style={[styles.swatch, { backgroundColor: s.hex, borderColor: on ? theme.ink : 'transparent' }]}>
                    {on ? <Icon name="checkmark" size={18} color="#FFFFFF" weight="bold" /> : null}
                  </Pressable>
                );
              })}
            </View>
            <View style={{ marginTop: 24 }}>
              <Segmented
                label="Appearance"
                options={APPEARANCES}
                value={settings.appearance}
                onChange={(v) => setSetting('appearance', v)}
              />
            </View>
          </Step>
        ) : null}

        {step === 2 ? (
          <Step
            title="reminders"
            lead="plancy can tap you on the shoulder before something is due."
            feature={<NotificationPreview title="Call the contractor" body="In 10 min, 10:30 am" />}
            primary="Turn on reminders"
            onPrimary={async () => {
              haptic('select');
              await askPermission();
              setSetting('remind', true);
              setStep(3);
            }}
            secondary="Not now"
            onSecondary={() => {
              setSetting('remind', false);
              setStep(3);
            }}>
            <Text style={{ color: theme.ink2, fontSize: Type.callout }}>
              Reminders are set on this iPhone, so they arrive with no signal and nothing is sent
              anywhere. You can turn them off in Settings at any time.
            </Text>
          </Step>
        ) : null}

        {step === 3 ? (
          <Step
            title="each morning"
            lead="One notification a day with the plan ahead."
            feature={
              <NotificationPreview
                title="11 days running. Make it 12"
                subtitle="3 planned, first at 7:00 am"
                body={'7:00 am  ·  Morning run\n9:30 am  ·  Stand-up\n2:00 pm  ·  Draft the spec'}
                actions={['See my day', 'Add a task']}
              />
            }
            primary="Send me a morning nudge"
            onPrimary={() => {
              haptic('select');
              setSetting('nudge', true);
              finish();
            }}
            secondary="Not now"
            onSecondary={finish}>
            <Text style={{ color: theme.ink2, fontSize: Type.callout }}>
              At eight in the morning: what is on today, and how long your streak is. Mondays add
              last week&apos;s tally. It is off unless you ask for it, and Settings can change the
              hour or stop it.
            </Text>
          </Step>
        ) : null}
      </Animated.View>

      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: i === step ? theme.accent : theme.line }]}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * A mock of the notification the next button is asking permission for.
 *
 * It fills a screen that would otherwise be a wall of text, but that isn't
 * why it's here: the honest way to ask for a permission is to show what will
 * actually arrive. The wording matches what `lib/reminders.ts` and
 * `lib/nudges.ts` really produce — if either changes, change this too, because
 * a preview that lies is worse than no preview.
 */
function NotificationPreview({
  title,
  subtitle,
  body,
  actions,
}: {
  title: string;
  subtitle?: string;
  body: string;
  actions?: string[];
}) {
  const theme = useTheme();
  return (
    <View
      // One element, read as one notification, rather than five loose strings.
      accessible
      accessibilityLabel={`Example notification: ${title}. ${subtitle ?? ''} ${body.replace(/\n/g, '. ')}`}
      style={[styles.notice, { backgroundColor: theme.card, shadowColor: '#000000' }]}>
      <View style={styles.noticeHead}>
        <Image
          source={require('../../assets/icon/plancy-light.png')}
          style={styles.noticeIcon}
          resizeMode="cover"
        />
        <Text style={{ flex: 1, color: theme.ink2, fontSize: 11, letterSpacing: 0.6 }}>PLANCY</Text>
        <Text style={{ color: theme.ink3, fontSize: 11 }}>now</Text>
      </View>
      <Text style={{ color: theme.ink, fontSize: Type.callout, fontWeight: '600' }}>{title}</Text>
      {subtitle ? <Text style={{ color: theme.ink, fontSize: Type.footnote }}>{subtitle}</Text> : null}
      <Text style={{ color: theme.ink2, fontSize: Type.footnote, lineHeight: 19, marginTop: 2 }}>{body}</Text>
      {actions ? (
        <View style={[styles.noticeActions, { borderTopColor: theme.line }]}>
          {actions.map((a, i) => (
            <View
              key={a}
              style={[styles.noticeAction, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.line }]}>
              <Text style={{ color: theme.ink2, fontSize: Type.footnote }}>{a}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Step({
  title,
  lead,
  children,
  feature,
  primary,
  onPrimary,
  secondary,
  onSecondary,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
  /** Sits on its own, centred in whatever room the copy leaves it. */
  feature?: React.ReactNode;
  primary: string;
  onPrimary: () => void;
  secondary?: string;
  onSecondary?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.body, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}>
        <Text
          accessibilityRole="header"
          style={{ color: theme.ink, fontFamily: Type.display, fontSize: 38, letterSpacing: -0.5 }}>
          {title}
          <Text style={{ color: theme.accent }}>.</Text>
        </Text>
        <Text style={{ color: theme.ink, fontSize: Type.sectionTitle, marginTop: 6, marginBottom: 22 }}>{lead}</Text>
        {children}
        {/* flexGrow on the container hands the leftover height to this, so a
            short screen centres its preview instead of leaving a dead band —
            and a long one (large text sizes) just scrolls as usual. */}
        {feature ? <View style={styles.feature}>{feature}</View> : null}
      </ScrollView>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onPrimary}
          style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}>
          <Text style={{ color: theme.onAccent, fontSize: Type.body, fontWeight: '600' }}>{primary}</Text>
        </Pressable>
        {secondary && onSecondary ? (
          <Pressable
            accessibilityRole="button"
            onPress={onSecondary}
            style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={{ color: theme.ink2, fontSize: Type.body }}>{secondary}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: 96, paddingHorizontal: 28, paddingBottom: 24 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  bullet: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  swatch: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feature: { flex: 1, justifyContent: 'center', paddingVertical: 20 },
  notice: {
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingTop: 11,
    paddingBottom: 12,
    gap: 1,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },
  noticeHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  noticeIcon: { width: 19, height: 19, borderRadius: 4.5 },
  noticeActions: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 11, marginHorizontal: -15 },
  noticeAction: { flex: 1, alignItems: 'center', paddingTop: 11, paddingBottom: 1 },
  actions: { paddingHorizontal: 28, paddingBottom: 12, gap: 4 },
  primary: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  secondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, paddingBottom: 28 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});
