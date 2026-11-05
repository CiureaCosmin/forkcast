import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'title'
    | 'heading'
    | 'stat'
    | 'subheading'
    | 'body'
    | 'bodyStrong'
    | 'compact'
    | 'small'
    | 'caption'
    | 'label';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'body', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  title: { fontFamily: Fonts.heading, fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  heading: { fontFamily: Fonts.heading, fontSize: 20, lineHeight: 26 },
  stat: { fontFamily: Fonts.heading, fontSize: 32, lineHeight: 38 },
  subheading: { fontFamily: Fonts.bodySemiBold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: Fonts.body, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: Fonts.bodySemiBold, fontSize: 16, lineHeight: 22 },
  compact: { fontFamily: Fonts.bodySemiBold, fontSize: 15, lineHeight: 20 },
  small: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 18 },
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
