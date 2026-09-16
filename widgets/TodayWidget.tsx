/**
 * The home screen widget, in the two smallest sizes.
 *
 * Everything it shows arrives as props from src/lib/widget.ts, which the app
 * refreshes on every change and once a night at midnight. Code in here can
 * only use @expo/ui/swift-ui pieces and cannot reach anything outside the
 * function, which is why the layout is spelled out in full.
 *
 * `style` is the person's pick in Settings → Widget:
 *   progress  "2 of 5 done" with the streak under it (default)
 *   streak    the streak count, large, for the daily hit of seeing it grow
 *   tasks     the next few tasks
 * The medium size always adds the next tasks on the right.
 */
import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundColor, frame, lineLimit, minimumScaleFactor, opacity, padding, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type TodayWidgetProps = {
  /** "Wednesday 16 Sep" */
  day: string;
  done: number;
  total: number;
  streak: number;
  next: { time: string; title: string }[];
  style: 'progress' | 'streak' | 'tasks';
  /** Accent hex, already adjusted for light or dark by the app. */
  accent: string;
};

const TodayWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const medium = environment.widgetFamily === 'systemMedium';
  const showTasks = medium || props.style === 'tasks';
  const rows = props.next.slice(0, medium ? 3 : 4);

  const wordmark = (
    <HStack spacing={0}>
      <Text modifiers={[font({ family: 'Futura-Medium', size: 15 })]}>today</Text>
      <Text modifiers={[font({ family: 'Futura-Medium', size: 15 }), foregroundColor(props.accent)]}>.</Text>
      <Spacer />
      <Text modifiers={[font({ size: 12, weight: 'medium' }), opacity(0.6)]}>{props.day}</Text>
    </HStack>
  );

  const progress = (
    <VStack alignment="leading" spacing={2}>
      <HStack alignment="firstTextBaseline" spacing={4}>
        <Text modifiers={[font({ size: 34, weight: 'bold', design: 'rounded' }), foregroundColor(props.accent)]}>
          {String(props.done)}
        </Text>
        <Text modifiers={[font({ size: 17, weight: 'semibold' }), opacity(0.6)]}>{`of ${props.total}`}</Text>
      </HStack>
      <Text modifiers={[font({ size: 13, weight: 'medium' }), opacity(0.6)]}>
        {props.total === 0 ? 'nothing planned' : props.done === props.total ? 'all done' : 'done today'}
      </Text>
      {props.streak > 0 ? (
        <HStack spacing={4} modifiers={[padding({ top: 6 })]}>
          <Image systemName="flame.fill" size={13} color={props.accent} />
          <Text modifiers={[font({ size: 13, weight: 'semibold' })]}>{`${props.streak}-day streak`}</Text>
        </HStack>
      ) : null}
    </VStack>
  );

  const streak = (
    <VStack alignment="leading" spacing={2}>
      <HStack alignment="firstTextBaseline" spacing={6}>
        <Image systemName="flame.fill" size={26} color={props.accent} />
        <Text modifiers={[font({ size: 40, weight: 'bold', design: 'rounded' }), foregroundColor(props.accent)]}>
          {String(props.streak)}
        </Text>
      </HStack>
      <Text modifiers={[font({ size: 13, weight: 'medium' }), opacity(0.6)]}>
        {props.streak === 1 ? 'day streak' : 'day streak'}
      </Text>
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), padding({ top: 6 })]}>
        {props.total === 0 ? 'Nothing planned today' : `${props.done} of ${props.total} done today`}
      </Text>
    </VStack>
  );

  const tasks = (
    <VStack alignment="leading" spacing={5}>
      {rows.length === 0 ? (
        <Text modifiers={[font({ size: 13, weight: 'medium' }), opacity(0.6)]}>
          {props.total === 0 ? 'Nothing planned. Tap to add.' : 'All done for today.'}
        </Text>
      ) : null}
      {rows.map((t, i) => (
        <HStack key={String(i)} alignment="firstTextBaseline" spacing={6}>
          <Text modifiers={[font({ size: 12, weight: 'semibold', design: 'rounded' }), foregroundColor(props.accent), frame({ width: 46, alignment: 'leading' })]}>
            {t.time}
          </Text>
          <Text modifiers={[font({ size: 13, weight: 'medium' }), lineLimit(1), minimumScaleFactor(0.85)]}>{t.title}</Text>
        </HStack>
      ))}
    </VStack>
  );

  const main = props.style === 'streak' ? streak : props.style === 'tasks' && !medium ? tasks : progress;

  return (
    <VStack alignment="leading" spacing={8} modifiers={[widgetURL('plancy://today')]}>
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
