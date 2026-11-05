import { TextInput, View } from 'react-native';

import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Icon } from './icon';

export function SearchField({
  value,
  onChangeText,
  label,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  label: string;
  placeholder: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 48,
        paddingHorizontal: 14,
        backgroundColor: theme.surface,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: Radius.input,
        borderCurve: 'continuous',
      }}>
      <Icon name="search" size={20} color={theme.textSecondary} />
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        returnKeyType="search"
        autoCorrect={false}
        style={{
          flex: 1,
          fontFamily: Fonts.body,
          fontSize: 16,
          color: theme.text,
        }}
      />
    </View>
  );
}
