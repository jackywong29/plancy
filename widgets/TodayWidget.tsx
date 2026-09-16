/**
 * The home screen widget, in the two smallest sizes.
 *
 * Everything it shows arrives as props from src/lib/widget.ts, which the app
 * refreshes on every change and once a night at midnight. Code in here can
 * only use @expo/ui/swift-ui pieces and cannot reach anything outside the
 * function, which is why the layout is spelled out in full.
 *
 * It must declare its background with containerBackground. Without one, iOS
 * replaces the whole widget with a blank "adopt containerBackground" card
 * whose tap opens a documentation link; that was the white tile.
 *
 * It must never throw. iOS draws a placeholder with no props at all (in the
 * widget gallery, and before plancy has run once), and in a release build a
 * layout that throws renders as an empty white tile. So every prop has a
 * default, and "no data yet" has its own friendly state.
 *
 * `style` is the person's pick in Settings → Widget:
 *   progress  "2 of 5" done with the streak under it (default)
 *   streak    the streak count, large, for the daily hit of seeing it grow
 *   tasks     the next few tasks
 * The medium size always adds the next tasks on the right.
 */
import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundColor,
  frame,
  lineLimit,
  minimumScaleFactor,
  opacity,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type TodayWidgetProps = {
  /** "Wed 16 Sep" */
  day: string;
  done: number;
  total: number;
  streak: number;
  next: { time: string; title: string }[];
  style: 'progress' | 'streak' | 'tasks';
  /** Accent hex, already adjusted by the app. */
  accent: string;
};

const TodayWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const p = (props ?? {}) as Partial<TodayWidgetProps>;
  const hasData = typeof p.total === 'number';
  const accent = typeof p.accent === 'string' && p.accent ? p.accent : '#6D5EF0';
  const done = typeof p.done === 'number' ? p.done : 0;
  const total = typeof p.total === 'number' ? p.total : 0;
  const streakDays = typeof p.streak === 'number' ? p.streak : 0;
  const next = Array.isArray(p.next) ? p.next : [];
  const style = p.style === 'streak' || p.style === 'tasks' ? p.style : 'progress';
  const medium = environment?.widgetFamily === 'systemMedium';
  const rows = next.slice(0, medium ? 3 : 4);
  // plancy's own card colours, so the widget looks like a piece of the app.
  const background = containerBackground(environment?.colorScheme === 'dark' ? '#1E1D21' : '#FFFFFF', 'widget');

  const wordmark = (
    <HStack spacing={0}>
      <Text modifiers={[font({ family: 'Futura-Medium', size: 15 })]}>today</Text>
      <Text modifiers={[font({ family: 'Futura-Medium', size: 15 }), foregroundColor(accent)]}>.</Text>
      <Spacer />
      {p.day ? <Text modifiers={[font({ size: 12, weight: 'medium' }), opacity(0.6)]}>{p.day}</Text> : null}
    </HStack>
  );

  if (!hasData) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[widgetURL('plancy://'), background]}>
        {wordmark}
        <Spacer minLength={0} />
        <Image systemName="checklist" size={26} color={accent} />
        <Text modifiers={[font({ size: 13, weight: 'semibold' })]}>Open plancy to see your day here.</Text>
        <Spacer minLength={0} />
      </VStack>
    );
  }

  const progress = (
    <VStack alignment="leading" spacing={2}>
      <HStack alignment="firstTextBaseline" spacing={4}>
        <Text modifiers={[font({ size: 34, weight: 'bold', design: 'rounded' }), foregroundColor(accent)]}>{String(done)}</Text>
        <Text modifiers={[font({ size: 17, weight: 'semibold' }), opacity(0.6)]}>{`of ${total}`}</Text>
      </HStack>
      <Text modifiers={[font({ size: 13, weight: 'medium' }), opacity(0.6)]}>
        {total === 0 ? 'nothing planned' : done === total ? 'all done' : 'done today'}
      </Text>
      {streakDays > 0 ? (
        <HStack spacing={4} modifiers={[padding({ top: 6 })]}>
          <Image systemName="flame.fill" size={13} color={accent} />
          <Text modifiers={[font({ size: 13, weight: 'semibold' })]}>{`${streakDays}-day streak`}</Text>
        </HStack>
      ) : null}
    </VStack>
  );

  const streak = (
    <VStack alignment="leading" spacing={2}>
      <HStack alignment="firstTextBaseline" spacing={6}>
        <Image systemName="flame.fill" size={26} color={accent} />
        <Text modifiers={[font({ size: 40, weight: 'bold', design: 'rounded' }), foregroundColor(accent)]}>{String(streakDays)}</Text>
      </HStack>
      <Text modifiers={[font({ size: 13, weight: 'medium' }), opacity(0.6)]}>{streakDays === 1 ? 'day streak' : 'days in a row'}</Text>
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), padding({ top: 6 })]}>
        {total === 0 ? 'Nothing planned today' : done === total ? 'Today is done' : `${done} of ${total} done today`}
      </Text>
    </VStack>
  );

  const tasks = (
    <VStack alignment="leading" spacing={5}>
      {rows.length === 0 ? (
        <Text modifiers={[font({ size: 13, weight: 'medium' }), opacity(0.6)]}>
          {total === 0 ? 'Nothing planned. Tap to add.' : 'All done for today.'}
        </Text>
      ) : null}
      {rows.map((t, i) => (
        <HStack key={String(i)} alignment="firstTextBaseline" spacing={6}>
          <Text
            modifiers={[
              font({ size: 12, weight: 'semibold', design: 'rounded' }),
              foregroundColor(accent),
              frame({ width: 50, alignment: 'leading' }),
            ]}>
            {String(t?.time ?? '')}
          </Text>
          <Text modifiers={[font({ size: 13, weight: 'medium' }), lineLimit(1), minimumScaleFactor(0.85)]}>{String(t?.title ?? '')}</Text>
        </HStack>
      ))}
    </VStack>
  );

  const main = style === 'streak' ? streak : style === 'tasks' && !medium ? tasks : progress;

  return (
    <VStack alignment="leading" spacing={8} modifiers={[widgetURL('plancy://'), background]}>
      {wordmark}
      <Spacer minLength={0} />
      {medium ? (
        <HStack alignment="top" spacing={14}>
          {main}
          <Spacer minLength={8} />
          <VStack alignment="leading" spacing={6} modifiers={[frame({ width: 150 })]}>
            <Text modifiers={[font({ size: 11, weight: 'semibold' }), opacity(0.6)]}>NEXT</Text>
            {tasks}
          </VStack>
        </HStack>
      ) : (
        main
      )}
      <Spacer minLength={0} />
    </VStack>
  );
};

export default createWidget<TodayWidgetProps>('TodayWidget', TodayWidget);
