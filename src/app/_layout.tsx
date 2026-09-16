import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastProvider } from '@/components/toast';
import { StoreProvider, useStore } from '@/data/store';
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
  const { settings } = useStore();
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
        <Stack.Screen
          name="task"
          options={{ presentation: 'modal', headerShadowVisible: false }}
        />
      </Stack>
    </>
  );
}
