import type { ComponentProps } from 'react';
import { TextInput, View } from 'react-native';

import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export function TextField({
  label,
  hint,
  error,
  multiline,
  ...props
}: Omit<ComponentProps<typeof TextInput>, 'style' | 'accessibilityLabel'> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <ThemedText type="small" style={{ fontFamily: Fonts.bodySemiBold }}>
        {label}
      </ThemedText>
      <TextInput
        {...props}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        multiline={multiline}
        placeholderTextColor={theme.textSecondary}
        style={{
          minHeight: multiline ? 120 : 48,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: theme.surface,
          borderColor: error ? theme.accent : theme.border,
          borderWidth: 1,
          borderRadius: Radius.input,
          borderCurve: 'continuous',
          fontFamily: Fonts.body,
          fontSize: 16,
          color: theme.text,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
      {hint ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
      {error ? (
        <ThemedText type="caption" style={{ color: theme.accent }}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}
