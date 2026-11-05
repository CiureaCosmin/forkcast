import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Icon, type IconName } from './icon';
import { ThemedText } from './themed-text';

type Variant = 'primary' | 'secondary' | 'dashed' | 'herb';

export function Button({
  title,
  accessibilityLabel = title,
  variant = 'primary',
  icon,
  onPress,
  style,
}: {
  title: string;
  accessibilityLabel?: string;
  variant?: Variant;
  icon?: IconName;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const look: Record<
    Variant,
    { container: ViewStyle; color: string; fontFamily: string; fontSize: number }
  > = {
    primary: {
      container: { backgroundColor: theme.accent, minHeight: 44, borderRadius: Radius.button },
      color: theme.onAccent,
      fontFamily: Fonts.bodySemiBold,
      fontSize: 15,
    },
    secondary: {
      container: {
        backgroundColor: theme.surface,
        borderColor: theme.border,
        borderWidth: 1,
        minHeight: 44,
        borderRadius: Radius.button,
      },
      color: theme.text,
      fontFamily: Fonts.bodyMedium,
      fontSize: 15,
    },
    dashed: {
      container: {
        borderColor: theme.dashed,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        minHeight: 56,
        borderRadius: 16,
      },
      color: theme.herb,
      fontFamily: Fonts.bodySemiBold,
      fontSize: 15,
    },
    herb: {
      container: {
        backgroundColor: theme.herb,
        minHeight: 44,
        paddingHorizontal: 16,
        borderRadius: Radius.button,
      },
      color: theme.onAccent,
      fontFamily: Fonts.bodySemiBold,
      fontSize: 14,
    },
  };
  const current = look[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        },
        current.container,
        style,
      ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon && <Icon name={icon} size={18} color={current.color} />}
        <ThemedText
          style={{
            color: current.color,
            fontFamily: current.fontFamily,
            fontSize: current.fontSize,
          }}>
          {title}
        </ThemedText>
      </View>
    </Pressable>
  );
}
