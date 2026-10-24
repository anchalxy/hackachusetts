import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { color, fontFiles } from '@/ui/theme';

SplashScreen.preventAutoHideAsync();

const FLOWS = ['urban-wild', 'spend-2-million', 'cummins-walk-audit', 'rat-patrol', 'council-meeting'];

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Bricolage Grotesque + DM Sans (design/assets/fonts). Hold the splash until they're in.
  const [fontsLoaded, fontError] = useFonts(fontFiles);
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
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
          {/* Each challenge flow is its own native stack, presented as a page sheet. */}
          {FLOWS.map((flow) => (
            <Stack.Screen key={flow} name={`flow/${flow}`} options={{ presentation: 'modal' }} />
          ))}
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
