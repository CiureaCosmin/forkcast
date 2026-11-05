import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth } from '@/constants/theme';

/** Scrolling body for screens pushed on the stack, below the native header. */
export function StackContent({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingTop: 8,
        paddingBottom: insets.bottom + 24,
        alignItems: 'center',
      }}
      keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: 20, gap: 20 }}>
        {children}
      </View>
    </ScrollView>
  );
}
