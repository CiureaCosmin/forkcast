import { View } from 'react-native';

import { MaxContentWidth } from '@/constants/theme';
import { people } from '@/data/sample';
import { chooseMe } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';
import { Button } from './button';
import { ThemedText } from './themed-text';

/** First launch: everything on this device then belongs to the chosen person. */
export function WhoAreYou() {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: theme.background,
      }}>
      <View style={{ width: '100%', maxWidth: MaxContentWidth, gap: 12 }}>
        <ThemedText type="title" accessibilityRole="header">
          Who's using this phone?
        </ThemedText>
        {people.map((person) => (
          <Button key={person.id} title={person.name} onPress={() => chooseMe(person.id)} />
        ))}
      </View>
    </View>
  );
}
