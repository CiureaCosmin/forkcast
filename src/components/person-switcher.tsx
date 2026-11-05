import { View } from 'react-native';

import { people } from '@/data/sample';
import { useStore, viewPerson } from '@/data/store';
import { Chip } from './chip';

/** Switches whose plan and history are on screen. */
export function PersonSwitcher() {
  const { viewing } = useStore();
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
