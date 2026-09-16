import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/theme/theme';

/**
 * The real iOS tab bar, not a drawn copy: it picks up Liquid Glass, the
 * system blur and every accessibility setting for free.
 */
export default function TabsLayout() {
  const theme = useTheme();
  return (
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

      <NativeTabs.Trigger name="money">
        <NativeTabs.Trigger.Label>Money</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="creditcard" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
