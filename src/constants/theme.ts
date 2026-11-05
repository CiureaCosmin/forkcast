/**
 * Forkcast's "Fresh Market" design tokens: light, card-based, tomato accent.
 * Read colors through `useTheme()` so light and dark both work.
 */

export const Colors = {
  light: {
    background: '#F3F5F2',
    surface: '#FFFFFF',
    text: '#17251E',
    textSecondary: '#5B6B62',
    border: '#DCE2DC',
    divider: '#EEF1EE',
    dashed: '#AEBBB2',
    accent: '#C2461C',
    onAccent: '#FFFFFF',
    herb: '#2F6B4F',
    herbSoft: '#E2EBE3',
  },
  dark: {
    background: '#101512',
    surface: '#1A211D',
    text: '#E8EEEA',
    textSecondary: '#9AAAA1',
    border: '#2E3A33',
    divider: '#262F29',
    dashed: '#51625A',
    accent: '#E0643A',
    onAccent: '#101512',
    herb: '#7FC29E',
    herbSoft: '#22332A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Font family names registered by `useFonts` in the root layout. */
export const Fonts = {
  heading: 'BricolageGrotesque_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
};

export const Radius = {
  button: 12,
  input: 14,
  card: 18,
  cardLarge: 20,
  chip: 20,
} as const;

export const MaxContentWidth = 800;
