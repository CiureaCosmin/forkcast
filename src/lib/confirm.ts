import { Alert } from 'react-native';

import type { ConfirmOptions } from './confirm.types';

/** Asks before a destructive action. Resolves to true if the user went ahead. */
export function confirm({ title, message, confirmLabel }: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
