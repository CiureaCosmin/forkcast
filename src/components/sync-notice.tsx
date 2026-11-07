import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

/** A line under the tab titles when changes haven't reached the household yet. */
export function SyncNotice() {
  const theme = useTheme();
  const { mode, sync } = useStore();
  if (mode !== 'backend') return null;
  const waiting = `${sync.pending} ${sync.pending === 1 ? 'change' : 'changes'} not synced yet`;
  const text =
    sync.status === 'signedOut'
      ? 'Signed out on the server. Sign in again to sync.'
      : sync.status === 'error'
        ? `Couldn't sync${sync.pending ? ` · ${waiting}` : ''}`
        : sync.status === 'offline' && sync.pending
          ? `Offline · ${waiting}`
          : null;
  if (!text) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${text}. Open household`}
      onPress={() => router.push('/household')}
      style={({ pressed }) => ({ paddingTop: 8, opacity: pressed ? 0.7 : 1 })}>
      <ThemedText
        type="small"
        style={{ color: sync.status === 'offline' ? theme.textSecondary : theme.accent }}>
        {text}
      </ThemedText>
    </Pressable>
  );
}
