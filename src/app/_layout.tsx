import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Appearance, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LaunchOverlay } from '@/components/launch/launch-overlay';
import { NotificationScheduler } from '@/components/notification-scheduler';
import { fontFiles, t as theme, useColors } from '@/ui/theme';

SplashScreen.preventAutoHideAsync();

// Light-only, everywhere: native UI (tab bar, sheets, alerts, keyboard, maps) follows this too.
// (Not on web: react-native-web has no setColorScheme.)
Appearance.setColorScheme?.('light');

// One navigation theme on the app background: no navigator ever paints its default white (or
// black) behind a screen or an overscroll.
const NAV_THEME: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.color.bg,
    card: theme.color.surface,
    text: theme.color.ink,
    border: theme.color.border,
    primary: theme.color.primary,
  },
};

const FLOWS = ['urban-wild', 'spend-2-million', 'cummins-walk-audit', 'rat-patrol', 'council-meeting'];

export default function RootLayout() {
  // Bricolage Grotesque + DM Sans (design/assets/fonts). Hold the splash until they're in.
  const [fontsLoaded, fontError] = useFonts(fontFiles);
  const color = useColors();
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={NAV_THEME}>
        <NotificationScheduler />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          {/* Transparent so the first-time intro can sit over the map as a sheet. */}
          <Stack.Screen
            name="new-report"
            options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="report/[id]" options={{ contentStyle: { backgroundColor: color.bg } }} />
          {/* Settings sheet from the profile's hamburger (DESIGN.md 6b). iOS page sheet: the profile peeks out, dimmed. */}
          <Stack.Screen name="menu" options={{ presentation: 'modal', contentStyle: { backgroundColor: color.bg } }} />
          {/* Tapping a trail stop: native form sheet sized to its content. */}
          <Stack.Screen
            name="challenge/[id]"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: 28,
              contentStyle: { backgroundColor: color.surface },
            }}
          />
          {/* Rewards: the crate toss plays full screen; each deal's QR is pushed like a page. */}
          <Stack.Screen name="crate" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="deal/[id]" options={{ contentStyle: { backgroundColor: color.bg } }} />
          {/* Each challenge flow is its own native stack, presented as a page sheet. */}
          {FLOWS.map((flow) => (
            <Stack.Screen key={flow} name={`flow/${flow}`} options={{ presentation: 'modal' }} />
          ))}
        </Stack>
        {/* Cold-start welcome (design/screens/launch): sits above everything, then lifts away to the trail. */}
        <LaunchOverlay />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
