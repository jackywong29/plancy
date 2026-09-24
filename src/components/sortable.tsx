/**
 * A short list whose rows can be dragged into a new order.
 *
 * Used for a day's anytime tasks. Each row has a grab handle; press and hold
 * it, then drag. The hold is deliberate: without it, a scroll that happens to
 * start on a handle would turn into a drag.
 *
 * Everything moves on the UI thread. While a row is held, it follows the
 * finger and the rows it passes slide out of its way by its height; nothing
 * re-renders until it's dropped, when the new order is handed to `onReorder`
 * and the rows settle into it. Rows can be different heights (notes add a
 * line), so each one reports its own.
 *
 * A drag is invisible to VoiceOver, so rows should also offer Move up and
 * Move down as accessibility actions — see `moveActions` below.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { move, offsetTo, slotFor } from '@/data/order';
import { haptic } from '@/lib/haptics';

type Shared = {
  active: SharedValue<number>;
  hover: SharedValue<number>;
  dragY: SharedValue<number>;
  heights: SharedValue<number[]>;
};

export type Handle = (children: ReactNode) => ReactNode;

export function Sortable<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
}: {
  items: T[];
  onReorder: (ids: string[]) => void;
  /** `handle` wraps whatever the row draws as its grabber. */
  renderItem: (item: T, index: number, handle: Handle) => ReactNode;
}) {
  const active = useSharedValue(-1);
  const hover = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const heights = useSharedValue<number[]>([]);
  const measured = useRef<number[]>([]);
  const shared: Shared = { active, hover, dragY, heights };

  // A new order has rendered: every row is back in its natural place.
  const key = items.map((i) => i.id).join(',');
  useEffect(() => {
    active.value = -1;
    hover.value = -1;
    dragY.value = 0;
  }, [key, active, hover, dragY]);

  const commit = (from: number, to: number) => {
    haptic('select');
    if (from === to) {
      active.value = -1;
      dragY.value = 0;
      return;
    }
    onReorder(move(items.map((i) => i.id), from, to));
  };

  return (
    <View>
      {items.map((item, index) => (
        <Row
          key={item.id}
          index={index}
          shared={shared}
          onHeight={(h) => {
            measured.current[index] = h;
            heights.value = measured.current.slice(0, items.length);
          }}
          onLift={() => haptic('select')}
          onDrop={commit}>
          {(handle) => renderItem(item, index, handle)}
        </Row>
      ))}
    </View>
  );
}

function Row({
  index,
  shared,
  onHeight,
  onLift,
  onDrop,
  children,
}: {
  index: number;
  shared: Shared;
  onHeight: (h: number) => void;
  onLift: () => void;
  onDrop: (from: number, to: number) => void;
  children: (handle: Handle) => ReactNode;
}) {
  const { active, hover, dragY, heights } = shared;

  const pan = Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart(() => {
      active.value = index;
      hover.value = index;
      dragY.value = 0;
      runOnJS(onLift)();
    })
    .onUpdate((e) => {
      dragY.value = e.translationY;
      hover.value = slotFor(index, e.translationY, heights.value);
    })
    .onEnd(() => {
      const to = hover.value;
      dragY.value = withTiming(offsetTo(index, to, heights.value), { duration: 140 }, (done) => {
        if (done) runOnJS(onDrop)(index, to);
      });
    })
    .onFinalize((_, success) => {
      // Cancelled before it activated or by the system: nothing moved.
      if (!success && active.value === index) {
        active.value = -1;
        hover.value = -1;
        dragY.value = withTiming(0, { duration: 140 });
      }
    });

  const style = useAnimatedStyle(() => {
    const a = active.value;
    if (a < 0) return { transform: [{ translateY: 0 }, { scale: 1 }], zIndex: 0, opacity: 1 };
    if (a === index) {
      return { transform: [{ translateY: dragY.value }, { scale: 1.02 }], zIndex: 10, opacity: 0.96 };
    }
    // Rows between where the held one was and where it's going step aside.
    const h = heights.value[a] ?? 0;
    const to = hover.value;
    const shift = a < index && index <= to ? -h : to <= index && index < a ? h : 0;
    return { transform: [{ translateY: withTiming(shift, { duration: 150 }) }, { scale: 1 }], zIndex: 0, opacity: 1 };
  });

  const handle: Handle = (content) => (
    <GestureDetector gesture={pan}>
      <View hitSlop={8} accessible={false}>
        {content}
      </View>
    </GestureDetector>
  );

  return (
    <Animated.View style={style} onLayout={(e) => onHeight(e.nativeEvent.layout.height)}>
      {children(handle)}
    </Animated.View>
  );
}

/** Move up / Move down, for VoiceOver, which can't perform a drag. */
export function moveActions(index: number, count: number, ids: string[], onReorder: (ids: string[]) => void) {
  const out: { name: string; label: string; onPress: () => void }[] = [];
  if (index > 0) out.push({ name: 'moveUp', label: 'Move up', onPress: () => onReorder(move(ids, index, index - 1)) });
  if (index < count - 1) {
    out.push({ name: 'moveDown', label: 'Move down', onPress: () => onReorder(move(ids, index, index + 1)) });
  }
  return out;
}
