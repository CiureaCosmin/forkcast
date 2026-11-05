import {
  TabList,
  type TabListProps,
  TabSlot,
  Tabs,
  TabTrigger,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, View } from 'react-native';

import { Fonts, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Icon, type IconName, tabIcons } from './icon';
import { ThemedText } from './themed-text';

export default function AppTabs() {
  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon={tabIcons.index}>Recipes</TabButton>
          </TabTrigger>
          <TabTrigger name="plan" href="/plan" asChild>
            <TabButton icon={tabIcons.plan}>Plan</TabButton>
          </TabTrigger>
          <TabTrigger name="history" href="/history" asChild>
            <TabButton icon={tabIcons.history}>History</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  icon,
  isFocused,
  ref,
  ...props
}: TabTriggerSlotProps & { icon: IconName }) {
  const theme = useTheme();
  const color = isFocused ? theme.accent : theme.textSecondary;
  return (
    <Pressable
      {...props}
      // expo-router/ui types the slot ref as a function-component ref, which doesn't match
      // RN 0.88's Pressable ref type. At runtime it is the Pressable's host element.
      ref={ref as unknown as React.Ref<React.ComponentRef<typeof Pressable>>}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Icon name={icon} size={24} color={color} />
      <ThemedText
        type="label"
        style={{
          color,
          textTransform: 'none',
          letterSpacing: 0,
          fontFamily: isFocused ? Fonts.bodySemiBold : Fonts.bodyMedium,
        }}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();
  return (
    <View
      {...props}
      accessibilityRole="tablist"
      style={{
        height: 72,
        backgroundColor: theme.surface,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        alignItems: 'center',
      }}>
      <View style={{ flex: 1, flexDirection: 'row', width: '100%', maxWidth: MaxContentWidth }}>
        {props.children}
      </View>
    </View>
  );
}
