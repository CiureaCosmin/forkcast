import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/hooks/use-theme';
import { symbolNames, tabIcons } from './icon';

const tabs = [
  { name: 'index', label: 'Recipes' },
  { name: 'plan', label: 'Plan' },
  { name: 'history', label: 'History' },
] as const;

export default function AppTabs() {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.surface}
      tintColor={theme.accent}
      iconColor={{ default: theme.textSecondary, selected: theme.accent }}
      labelStyle={{
        default: { color: theme.textSecondary },
        selected: { color: theme.accent },
      }}>
      {tabs.map(({ name, label }) => (
        <NativeTabs.Trigger key={name} name={name}>
          <NativeTabs.Trigger.Label>{label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={symbolNames[tabIcons[name]].ios}
            md={symbolNames[tabIcons[name]].android}
          />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
