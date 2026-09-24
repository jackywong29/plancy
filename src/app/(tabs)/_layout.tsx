import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { View } from 'react-native';

import { Fab } from '@/components/ui';
import { runAddAction, useAddLabel } from '@/lib/add-action';
import { useTheme } from '@/theme/theme';

/**
 * The real iOS tab bar, not a drawn copy: it picks up Liquid Glass, the
 * system blur and every accessibility setting for free.
 */
export default function TabsLayout() {
  const theme = useTheme();
  const addLabel = useAddLabel();
  return (
    <View style={{ flex: 1 }}>
      <NativeTabs
        // No background colour on purpose: iOS 26 paints the bar in Liquid Glass.
        labelStyle={{ color: theme.ink2, selected: { color: theme.accentText } }}
        iconColor={{ default: theme.ink2, selected: theme.accentText }}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="calendar" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="journal">
          <NativeTabs.Trigger.Label>Journal</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="book.closed" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="ideas">
          <NativeTabs.Trigger.Label>Ideas</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="lightbulb" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="finance">
          <NativeTabs.Trigger.Label>Finance</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="creditcard" />
        </NativeTabs.Trigger>
      </NativeTabs>
      {/* One add button for the whole app, centred above the tab bar, where
          either thumb reaches it. It sits over the tabs rather than inside
          them: the native bar can't host a custom control without being
          replaced by a drawn copy, and the glass circle iOS 26 puts beside the
          bar (UISearchTab) isn't exposed by react-native-screens yet — tried
          on 24 Sep, it rendered as an ordinary fifth tab. What it adds comes
          from lib/add-action.ts. Sheets and pushed screens cover it, so it
          only ever shows on the four tabs. */}
      <Fab icon="plus" label={addLabel} onPress={runAddAction} />
    </View>
  );
}
