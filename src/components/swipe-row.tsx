/**
 * A row you can tap, or swipe left to reveal actions. Optionally, swiping
 * right does one thing straight away (`leading`), the way Mail marks a
 * message read: the row springs back as the action happens.
 *
 * The finger that swipes also lifts off the row, and React Native counts that
 * lift as a tap, which used to open the task right after revealing its
 * actions. A tap only counts here if no swipe started since the finger went
 * down; tapping a row whose actions are showing closes them, as in Mail.
 *
 * Swipes are invisible to VoiceOver, so every action is also passed on as an
 * accessibility action. The leading one isn't: it must repeat a button that
 * is already in the row (and so in `inRowActions`), like the tick.
 */
import { useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Type } from '@/theme/theme';
import { haptic } from '@/lib/haptics';

import { Icon } from './ui';

export type SwipeAction = {
  name: string;
  label: string;
  icon: Parameters<typeof Icon>[0]['name'];
  background: string;
  ink: string;
  onPress: () => void;
};

/** An action with its own button inside the row, such as a tick or a star. */
export type RowAction = { name: string; label: string; onPress: () => void };

const ACTION_WIDTH = 76;

export function SwipeRow({
  actions,
  leading,
  inRowActions = [],
  onPress,
  style,
  containerStyle,
  children,
  ...a11y
}: {
  actions: SwipeAction[];
  /** Swipe right to do this at once. Must also be one of the row's own buttons. */
  leading?: SwipeAction;
  /**
   * VoiceOver reads the row as one element, so the buttons inside it can't be
   * reached on their own; they are offered as actions on the row instead.
   */
  inRowActions?: RowAction[];
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Clips the revealed actions, e.g. to a card's rounded corners. */
  containerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
} & Pick<PressableProps, 'accessibilityLabel' | 'accessibilityHint' | 'accessibilityRole' | 'accessibilityState'>) {
  const swipe = useRef<SwipeableMethods>(null);
  const swiped = useRef(false);
  const open = useRef(false);

  const run = (fn: () => void) => () => {
    swipe.current?.close();
    fn();
  };

  return (
    <ReanimatedSwipeable
      ref={swipe}
      friction={2}
      rightThreshold={40}
      leftThreshold={56}
      overshootRight={false}
      overshootLeft={false}
      containerStyle={containerStyle}
      onSwipeableOpenStartDrag={() => (swiped.current = true)}
      onSwipeableCloseStartDrag={() => (swiped.current = true)}
      onSwipeableWillOpen={(direction) => {
        // Swiped right far enough: the leading action happens, and the row
        // springs back. Its own handler owns the haptic.
        if (direction === 'right' && leading) {
          leading.onPress();
          swipe.current?.close();
          return;
        }
        if (!open.current) haptic('reveal');
        open.current = true;
      }}
      onSwipeableWillClose={() => (open.current = false)}
      renderLeftActions={
        leading
          ? () => (
              <View style={[styles.leading, { backgroundColor: leading.background }]}>
                <Icon name={leading.icon} size={22} color={leading.ink} />
                <Text style={[styles.actionLabel, { color: leading.ink }]}>{leading.label}</Text>
              </View>
            )
          : undefined
      }
      renderRightActions={() => (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Pressable
              key={a.name}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={run(a.onPress)}
              style={[styles.action, { backgroundColor: a.background }]}>
              <Icon name={a.icon} size={20} color={a.ink} />
              <Text style={[styles.actionLabel, { color: a.ink }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      )}>
      <Pressable
        {...a11y}
        onPressIn={() => (swiped.current = false)}
        onPress={() => {
          if (swiped.current) return;
          if (open.current) swipe.current?.close();
          else onPress?.();
        }}
        accessibilityActions={[...inRowActions, ...actions].map((a) => ({ name: a.name, label: a.label }))}
        onAccessibilityAction={(e) =>
          [...inRowActions, ...actions].find((a) => a.name === e.nativeEvent.actionName)?.onPress()
        }
        style={style}>
        {children}
      </Pressable>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row' },
  action: { width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center', gap: 3 },
  leading: { width: ACTION_WIDTH + 12, alignItems: 'center', justifyContent: 'center', gap: 3 },
  actionLabel: { fontSize: Type.caption, fontWeight: '600' },
});
