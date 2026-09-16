import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationTheme } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastProvider } from '@/components/toast';
import { StoreProvider, useStore } from '@/data/store';
import { Locked, LockProvider } from '@/lib/lock';
import { syncReminders } from '@/lib/reminders';
import { syncWidget } from '@/lib/widget';
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
    syncWidget(tasks, settings);
  }, [tasks, settings]);

  return (
    <ThemeProvider appearance={settings.appearance} accent={settings.accent}>
      <LockProvider settings={settings}>
        <ToastProvider>
          <Locked settings={settings} what="plancy" always>
            <Shell />
          </Locked>
        </ToastProvider>
      </LockProvider>
    </ThemeProvider>
  );
}

function Shell() {
  const theme = useTheme();
  // The navigation library tells iOS whether each header is light or dark
  // from its own theme, not the phone's. Without this, headers and their
  // glass buttons stay light in a dark plancy.
  const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.accentText,
      background: theme.ground,
      card: theme.ground,
      text: theme.ink,
      border: theme.line,
      notification: theme.bad,
    },
  };
  return (
    <NavigationTheme value={navTheme}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.ground },
          headerStyle: { backgroundColor: theme.ground },
          headerTintColor: theme.accentText,
          // Just the chevron, as in iOS 26's own apps.
          headerBackButtonDisplayMode: 'minimal',
          headerTitleStyle: { color: theme.ink },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="currency" options={{ title: 'Currency' }} />
        <Stack.Screen name="money" options={{ presentation: 'modal', headerShadowVisible: false }} />
        <Stack.Screen
          name="task"
          options={{ presentation: 'modal', headerShadowVisible: false }}
        />
      </Stack>
    </NavigationTheme>
  );
}
