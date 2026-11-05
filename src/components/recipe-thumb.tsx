import { View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { initials } from '@/lib/stats';
import { ThemedText } from './themed-text';

/** Initials tile; a photo replaces it once recipes have `photoUrl`s. */
export function RecipeThumb({ name, size = 64 }: { name: string; size?: number }) {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        borderCurve: 'continuous',
        backgroundColor: theme.herbSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <ThemedText
        themeColor="herb"
        style={{ fontFamily: Fonts.heading, fontSize: size > 60 ? 22 : 20, lineHeight: 26 }}>
        {initials(name)}
      </ThemedText>
    </View>
  );
}
