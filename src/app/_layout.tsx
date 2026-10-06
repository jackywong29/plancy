import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationTheme, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CelebrationProvider } from '@/components/celebration';
import { Onboarding } from '@/components/onboarding';
import { ToastProvider } from '@/components/toast';
import { StoreProvider, useStore } from '@/data/store';
import { setHapticsEnabled } from '@/lib/haptics';
import { refreshLaunchScreenCache } from '@/lib/launch-cache';
import { AppLock, LockProvider } from '@/lib/lock';
import { syncReminders } from '@/lib/reminders';
import { useWidgetSync } from '@/lib/widget';
import { ThemeProvider, useTheme } from '@/theme/theme';

// Keep the launch screen up until plancy has drawn its first frame in the
// person's own colours, then dissolve into it. The launch screen (app.json)
// is the plancy mark on plancy's own light or dark background, so the
// dissolve goes from mark to app on the same ground.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 350, fade: true });
refreshLaunchScreenCache();

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
  const { settings, setSetting, tasks, setTasksDone } = useStore();
  setHapticsEnabled(settings.haptics);

  // Any change to tasks or reminder settings re-plans the week's alarms.
  useEffect(() => {
    void syncReminders(tasks, settings);
  }, [tasks, settings]);

  // The home screen widget, including ticks made on it.
  useWidgetSync(tasks, settings, setTasksDone);

  return (
    <ThemeProvider appearance={settings.appearance} accent={settings.accent}>
      <Ground>
        <LockProvider settings={settings} setSetting={setSetting}>
          <ToastProvider>
            <AppLock>
              <CelebrationProvider>
                {/* The first run owns the whole screen: no tab bar to wander
                    off into, and no permission prompt until it is asked for. */}
                {settings.onboarded ? <Shell /> : <Onboarding settings={settings} setSetting={setSetting} />}
              </CelebrationProvider>
            </AppLock>
          </ToastProvider>
        </LockProvider>
      </Ground>
    </ThemeProvider>
  );
}

/**
 * The page everything sits on, in the theme's background. It also paints the
 * native root view to match (no white flash behind sheets or the keyboard)
 * and lets the launch screen go once the first frame is laid out.
 */
function Ground({ children }: { children: ReactNode }) {
  const theme = useTheme();
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.ground);
  }, [theme.ground]);
  const hidden = useRef(false);
  const onLayout = useCallback(() => {
    if (hidden.current) return;
    hidden.current = true;
    // One frame later, so the first paint is on screen before the dissolve.
    requestAnimationFrame(() => void SplashScreen.hideAsync());
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: theme.ground }} onLayout={onLayout}>
      {children}
    </View>
  );
}

/** Taps on a notification: the nudge's buttons, or the notification itself. */
function useNotificationTaps() {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!response) return;
    const key = `${response.notification.request.identifier}:${response.notification.date}:${response.actionIdentifier}`;
    if (handled.current === key) return;
    handled.current = key;
    const data = response.notification.request.content.data as { nudge?: boolean; date?: string } | undefined;
    if (data?.nudge && response.actionIdentifier === 'add-task') {
      router.navigate('/');
      router.push({ pathname: '/task', params: { date: data.date ?? '' } });
    } else {
      router.navigate('/');
    }
  }, [response, router]);
}

function Shell() {
  const theme = useTheme();
  useNotificationTaps();
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
        <Stack.Screen name="privacy" options={{ title: 'Privacy policy' }} />
        <Stack.Screen name="licences" options={{ title: 'Open-source licences' }} />
        <Stack.Screen name="money" options={{ presentation: 'modal', headerShadowVisible: false }} />
        <Stack.Screen name="task" options={{ presentation: 'modal', headerShadowVisible: false }} />
      </Stack>
    </NavigationTheme>
  );
}
