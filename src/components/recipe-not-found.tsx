import { ThemedText } from './themed-text';

export function RecipeNotFound() {
  return (
    <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', paddingTop: 48 }}>
      This recipe no longer exists.
    </ThemedText>
  );
}
