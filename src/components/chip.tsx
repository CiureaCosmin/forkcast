import { Pressable } from 'react-native';

import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export function Chip({
  label,
  accessibilityLabel = label,
  selected,
  onPress,
}: {
  label: string;
  accessibilityLabel?: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      aria-selected={!!selected}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 16,
        borderRadius: Radius.chip,
        borderCurve: 'continuous',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? theme.text : theme.surface,
        borderWidth: selected ? 0 : 1,
        borderColor: theme.border,
        opacity: pressed ? 0.7 : 1,
      })}>
      <ThemedText
        type="small"
        themeColor={selected ? 'background' : 'text'}
        style={{ fontFamily: selected ? Fonts.bodySemiBold : Fonts.bodyMedium }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
