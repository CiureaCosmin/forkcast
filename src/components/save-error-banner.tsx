import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

/** Shown over every screen while the latest meal change hasn't been saved. */
export function SaveErrorBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { saveFailed } = useStore();
  if (!saveFailed) return null;
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: insets.top + 10,
        paddingBottom: 10,
        paddingHorizontal: 20,
        backgroundColor: theme.accent,
      }}>
      <ThemedText accessibilityRole="alert" type="small" style={{ color: theme.onAccent }}>
        Couldn't save your last change. Please try again.
      </ThemedText>
    </View>
  );
}
