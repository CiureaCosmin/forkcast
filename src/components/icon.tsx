import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

const icons = {
  add: { ios: 'plus', android: 'add', web: 'add' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  recipes: { ios: 'book', android: 'menu_book', web: 'menu_book' },
  plan: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  history: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
} as const;

export type IconName = keyof typeof icons;

/** Decorative icon (SF Symbols on iOS, Material symbols elsewhere). Label the parent instead. */
export function Icon({ name, size, color }: { name: IconName; size: number; color: ColorValue }) {
  return (
    <SymbolView
      name={icons[name]}
      size={size}
      tintColor={color}
      weight="semibold"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/** Icon names for the tab bars, shared by the native and web variants. */
export const tabIcons = { index: 'recipes', plan: 'plan', history: 'history' } as const;
export const symbolNames = icons;
