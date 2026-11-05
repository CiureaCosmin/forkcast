import { View, type ViewProps } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** White (surface) rounded container. Pass `style` to adjust padding and layout. */
export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        { backgroundColor: theme.surface, borderRadius: Radius.card, borderCurve: 'continuous' },
        style,
      ]}
      {...rest}
    />
  );
}
