import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';

import { MaxContentWidth } from '@/constants/theme';
import { AccountError, createHousehold, joinHousehold, signOut } from '@/data/account';
import { useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';
import { Button } from './button';
import { Chip } from './chip';
import { TextField } from './text-field';
import { ThemedText } from './themed-text';

type Mode = 'create' | 'join';

/** After signing in for the first time: start a household, or join the partner's. */
export function HouseholdSetup() {
  const theme = useTheme();
  const { account, recipes } = useStore();
  const [mode, setMode] = useState<Mode>('create');
  const [name, setName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return setError('Enter your name.');
    if (mode === 'create' && !householdName.trim()) return setError('Name the household.');
    if (mode === 'join' && code.trim().length !== 6) {
      return setError('Enter the six-character invite code.');
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === 'create') await createHousehold(householdName, name);
      else await joinHousehold(code, name);
    } catch (failure) {
      setError(
        failure instanceof AccountError
          ? failure.message
          : "Couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: 16 }}>
          <View style={{ gap: 4 }}>
            <ThemedText type="title" accessibilityRole="header">
              Your household
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {`Signed in as ${account?.email ?? ''}. Recipes are shared in the household; plans are your own.`}
            </ThemedText>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip
              label="Start one"
              selected={mode === 'create'}
              onPress={() => setMode('create')}
            />
            <Chip
              label="Join with a code"
              selected={mode === 'join'}
              onPress={() => setMode('join')}
            />
          </View>
          <TextField label="Your name" value={name} onChangeText={setName} autoComplete="name" />
          {mode === 'create' ? (
            <>
              <TextField
                label="Household name"
                placeholder="Home"
                value={householdName}
                onChangeText={setHouseholdName}
              />
              <ThemedText type="small" themeColor="textSecondary">
                {recipes.length > 0
                  ? `The ${recipes.length === 1 ? 'recipe' : `${recipes.length} recipes`} and your meals on this device move into it.`
                  : 'You get an invite code to share with your partner.'}
              </ThemedText>
            </>
          ) : (
            <>
              <TextField
                label="Invite code"
                hint="Your partner finds it on their Household screen"
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
              />
              <ThemedText type="small" themeColor="textSecondary">
                This device then shows the household's recipes and meals.
              </ThemedText>
            </>
          )}
          {error ? (
            <ThemedText accessibilityRole="alert" type="small" style={{ color: theme.accent }}>
              {error}
            </ThemedText>
          ) : null}
          <Button
            title={busy ? 'Please wait…' : mode === 'create' ? 'Start the household' : 'Join'}
            onPress={busy ? undefined : submit}
          />
          <Button title="Sign out" variant="secondary" onPress={() => void signOut()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
