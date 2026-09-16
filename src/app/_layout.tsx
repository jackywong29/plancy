import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastProvider } from '@/components/toast';
import { StoreProvider, useStore } from '@/data/store';
import { syncReminders } from '@/lib/reminders';
import { ThemeProvider, useTheme } from '@/theme/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StoreProvider>
        <Themed />
      </StoreProvider>
    </GestureHandlerRootView>
  );
}

/** Appearance and accent are settings, so the theme is read inside the store. */
function Themed() {
  const { settings, tasks } = useStore();

  // Any change to tasks or reminder settings re-plans the week's alarms.
  useEffect(() => {
    void syncReminders(tasks, settings);
  }, [tasks, settings]);

  return (
    <ThemeProvider appearance={settings.appearance} accent={settings.accent}>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </ThemeProvider>
  );
}

function Shell() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.ground },
          headerStyle: { backgroundColor: theme.ground },
          headerTintColor: theme.accentText,
          headerTitleStyle: { color: theme.ink },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="money" options={{ presentation: 'modal', headerShadowVisible: false }} />
        <Stack.Screen
          name="task"
          options={{ presentation: 'modal', headerShadowVisible: false }}
        />
      </Stack>
    </>
  );
}
