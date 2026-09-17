/**
 * The home screen widget, small and medium. Tick tasks right on it.
 *
 * Everything arrives as props from src/lib/widget.ts. Code in here can only
 * use @expo/ui/swift-ui pieces and nothing declared outside this function.
 *
 * Interactive (iOS 17+): each task row is a button. Its onPress returns new
 * props, which iOS saves and redraws with no need to open plancy. The ids
 * ticked here are kept in `touched`; plancy applies them to its own data the
 * next time it runs, then sends a fresh timeline.
 *
 * Rules learned the hard way:
 * - containerBackground is required, or iOS swaps the widget for a blank card;
 * - it must never throw (a release build draws a throwing layout as an empty
 *   tile, and iOS's placeholder passes no props), so every prop has a default.
 *
 * Layout, in points (content area after the system's 16pt margins):
 *   small  ~138 × 138   header, hero number, one line, the next task
 *   medium ~332 × 138   a 116pt summary column, then three task rows
 * Times sit in a fixed column on one line; titles truncate, never wrap.
 */
import { Button, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  containerBackground,
  font,
  foregroundColor,
  frame,
  lineLimit,
  minimumScaleFactor,
  opacity,
  padding,
  strikethrough,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type WidgetTask = { id: string; time: string; title: string; done: boolean };

export type TodayWidgetProps = {
  /** YYYY-MM-DD this entry is for. */
  date: string;
  /** "Thu 17 Sep" */
  day: string;
  /** Every task that day, in the order to show them (open first, then done). */
  tasks: WidgetTask[];
  /** Finished days in a row before this one. Today adds one once it's done. */
  streakBefore: number;
  style: 'progress' | 'streak' | 'tasks';
  /** Accent, already adjusted by the app. */
  accent: string;
  /** Tasks ticked or unticked on the widget, not yet seen by the app. */
  touched: string[];
};

const TodayWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const p = (props ?? {}) as Partial<TodayWidgetProps>;
  const tasks = Array.isArray(p.tasks) ? p.tasks.filter((t) => t && typeof t.id === 'string') : [];
  const hasData = typeof p.date === 'string';
  const accent = typeof p.accent === 'string' && p.accent ? p.accent : '#6D5EF0';
  const touched = Array.isArray(p.touched) ? p.touched : [];
  const style = p.style === 'streak' || p.style === 'tasks' ? p.style : 'progress';
  const medium = environment?.widgetFamily === 'systemMedium';
  const dark = environment?.colorScheme === 'dark';

  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const finished = total > 0 && done === total;
  const streak = (typeof p.streakBefore === 'number' ? p.streakBefore : 0) + (finished ? 1 : 0);
  const secondary = dark ? '#A7A2AB' : '#6E6C76';

  const background = containerBackground(dark ? '#1E1D21' : '#FFFFFF', 'widget');

  // A tap flips one task. Rows keep their place so nothing jumps under the finger.
  const flip = (id: string) => () => ({
    tasks: tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    touched: touched.includes(id) ? touched : [...touched, id],
  });

  const wordmark = (
    <HStack spacing={0}>
      <Text modifiers={[font({ family: 'Futura-Medium', size: 16 })]}>today</Text>
      <Text modifiers={[font({ family: 'Futura-Medium', size: 16 }), foregroundColor(accent)]}>.</Text>
    </HStack>
  );

  const row = (t: WidgetTask, showTime: boolean) => (
    <Button key={t.id} target={`tick-${t.id}`} onPress={flip(t.id)} modifiers={[buttonStyle('plain')]}>
      <HStack spacing={8} alignment="center">
        <Image
          systemName={t.done ? 'checkmark.circle.fill' : 'circle'}
          size={19}
          color={t.done ? accent : secondary}
        />
        {showTime ? (
          <Text
            modifiers={[
              font({ size: 12, weight: 'semibold', design: 'rounded' }),
              foregroundColor(secondary),
              lineLimit(1),
              minimumScaleFactor(0.75),
              frame({ width: 52, alignment: 'leading' }),
            ]}>
            {String(t.time ?? '')}
          </Text>
        ) : null}
        <Text
          modifiers={[
            font({ size: 14, weight: 'medium' }),
            lineLimit(1),
            strikethrough({ isActive: t.done, pattern: 'solid' }),
            opacity(t.done ? 0.45 : 1),
          ]}>
          {String(t.title ?? '')}
        </Text>
        <Spacer minLength={0} />
      </HStack>
    </Button>
  );

  const hero =
    style === 'streak' ? (
      <VStack alignment="leading" spacing={0}>
        <HStack alignment="firstTextBaseline" spacing={4}>
          <Image systemName="flame.fill" size={24} color={accent} />
          <Text modifiers={[font({ size: 38, weight: 'bold', design: 'rounded' })]}>{String(streak)}</Text>
        </HStack>
        <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundColor(secondary), lineLimit(1)]}>
          {streak === 1 ? 'day in a row' : 'days in a row'}
        </Text>
      </VStack>
    ) : (
      <VStack alignment="leading" spacing={0}>
        <HStack alignment="firstTextBaseline" spacing={4}>
          <Text modifiers={[font({ size: 38, weight: 'bold', design: 'rounded' }), foregroundColor(accent)]}>{String(done)}</Text>
          <Text modifiers={[font({ size: 16, weight: 'semibold', design: 'rounded' }), foregroundColor(secondary)]}>{`of ${total}`}</Text>
        </HStack>
        <HStack spacing={4}>
          <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundColor(secondary), lineLimit(1)]}>
            {total === 0 ? 'nothing planned' : finished ? 'all done' : 'done'}
          </Text>
          {streak > 0 ? <Image systemName="flame.fill" size={11} color={accent} /> : null}
          {streak > 0 ? (
            <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundColor(secondary)]}>{String(streak)}</Text>
          ) : null}
        </HStack>
      </VStack>
    );

  if (!hasData) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[widgetURL('plancy://'), background]}>
        {wordmark}
        <Spacer minLength={0} />
        <Text modifiers={[font({ size: 14, weight: 'semibold' })]}>Open plancy to see your day here.</Text>
        <Spacer minLength={0} />
      </VStack>
    );
  }

  const empty = (
    <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundColor(secondary)]}>
      {total === 0 ? 'Nothing planned. Tap to add.' : 'Everything’s done.'}
    </Text>
  );

  if (medium) {
    const shown = tasks.slice(0, 3);
    const more = total - shown.length;
    return (
      <HStack alignment="top" spacing={16} modifiers={[widgetURL('plancy://'), background]}>
        <VStack alignment="leading" spacing={2} modifiers={[frame({ width: 116, alignment: 'leading' })]}>
          {wordmark}
          <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundColor(secondary), lineLimit(1)]}>
            {String(p.day ?? '')}
          </Text>
          <Spacer minLength={0} />
          {hero}
        </VStack>
        <VStack alignment="leading" spacing={9} modifiers={[padding({ top: 2 })]}>
          {shown.length === 0 ? empty : shown.map((t) => row(t, true))}
          <Spacer minLength={0} />
          {more > 0 ? (
            <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundColor(secondary)]}>{`${more} more in plancy`}</Text>
          ) : null}
        </VStack>
      </HStack>
    );
  }

  if (style === 'tasks') {
    const shown = tasks.slice(0, 4);
    return (
      <VStack alignment="leading" spacing={8} modifiers={[widgetURL('plancy://'), background]}>
        <HStack>
          {wordmark}
          <Spacer />
          <Text modifiers={[font({ size: 12, weight: 'semibold', design: 'rounded' }), foregroundColor(secondary)]}>{`${done}/${total}`}</Text>
        </HStack>
        {shown.length === 0 ? empty : shown.map((t) => row(t, false))}
        <Spacer minLength={0} />
      </VStack>
    );
  }

  const next = tasks.find((t) => !t.done) ?? tasks[0];
  return (
    <VStack alignment="leading" spacing={0} modifiers={[widgetURL('plancy://'), background]}>
      {wordmark}
      <Spacer minLength={0} />
      {hero}
      <Spacer minLength={0} />
      {next ? row(next, false) : empty}
    </VStack>
  );
};

export default createWidget<TodayWidgetProps>('TodayWidget', TodayWidget);
