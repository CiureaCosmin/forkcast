import { View } from 'react-native';

import { useStore, viewPerson } from '@/data/store';
import { Chip } from './chip';

/** Switches whose plan and history are on screen. */
export function PersonSwitcher() {
  const { viewing, people } = useStore();
  // Nothing to switch between until the partner has joined.
  if (people.length < 2) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 8, paddingTop: 12 }}>
      {people.map((person) => (
        <Chip
          key={person.id}
          label={person.name}
          selected={person.id === viewing}
          onPress={() => viewPerson(person.id)}
        />
      ))}
    </View>
  );
}
