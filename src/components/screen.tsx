import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SyncNotice } from './sync-notice';
import { ThemedText } from './themed-text';

/** Tab screen shell: safe area, scrolling, and the big title header. */
export function Screen({
  title,
  eyebrow,
  subtitle,
  headerRight,
  children,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 28,
        paddingBottom: 32,
        alignItems: 'center',
      }}
      keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: 20 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 2 }}>
            {eyebrow ? (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={{ fontFamily: Fonts.bodySemiBold }}>
                {eyebrow}
              </ThemedText>
            ) : null}
            <ThemedText type="title" accessibilityRole="header">
              {title}
            </ThemedText>
            {subtitle ? (
              <ThemedText type="small" themeColor="textSecondary">
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
          {headerRight}
        </View>
        <SyncNotice />
        {children}
      </View>
    </ScrollView>
  );
}
