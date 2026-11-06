import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono/600SemiBold';
import { JetBrainsMono_800ExtraBold } from '@expo-google-fonts/jetbrains-mono/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAppStore } from '@/lib/store';
import { AppThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { colors, dark } = useTheme();
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="session/[id]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="result/[id]" />
        <Stack.Screen name="law/[pcode]" />
        <Stack.Screen name="about" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ JetBrainsMono_600SemiBold, JetBrainsMono_800ExtraBold });
  const hydrated = useAppStore((s) => s.hydrated);
  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <Shell />
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
