import {
  BricolageGrotesque_700Bold,
  useFonts as useBricolageFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts as useInterFonts,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';

import { Button } from '@/components/button';
import { SaveErrorBanner } from '@/components/save-error-banner';
import { ThemedText } from '@/components/themed-text';
import { WhoAreYou } from '@/components/who-are-you';
import { Fonts } from '@/constants/theme';
import { loadData, useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

// Opening a recipe link directly still leaves the tabs underneath to go back to.
export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const { status, me } = useStore();
  const [bricolageLoaded, bricolageError] = useBricolageFonts({ BricolageGrotesque_700Bold });
  const [interLoaded, interError] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const fontsReady = (bricolageLoaded && interLoaded) || !!bricolageError || !!interError;
  const ready = fontsReady && status !== 'loading';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {status === 'error' ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 24,
            backgroundColor: theme.background,
          }}>
          <ThemedText accessibilityRole="alert" style={{ textAlign: 'center' }}>
            Couldn't load your data.
          </ThemedText>
          <Button title="Try again" onPress={loadData} style={{ paddingHorizontal: 24 }} />
        </View>
      ) : !me ? (
        <WhoAreYou />
      ) : (
        <>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.background },
              headerTintColor: theme.accent,
              headerTitleStyle: { fontFamily: Fonts.bodySemiBold, color: theme.text },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: theme.background },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="recipe/[id]/index" options={{ title: '' }} />
            <Stack.Screen
              name="recipe/new"
              options={{ title: 'New recipe', presentation: 'modal' }}
            />
            <Stack.Screen
              name="meal/new"
              options={{ title: 'Add a meal', presentation: 'modal' }}
            />
            <Stack.Screen name="meal/[id]" options={{ title: 'Meal', presentation: 'modal' }} />
            <Stack.Screen
              name="recipe/[id]/edit"
              options={{ title: 'Edit recipe', presentation: 'modal' }}
            />
          </Stack>
          <SaveErrorBanner />
        </>
      )}
    </ThemeProvider>
  );
}
