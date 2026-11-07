import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';

import { MaxContentWidth } from '@/constants/theme';
import { AccountError, signIn, signUp } from '@/data/account';
import { useTheme } from '@/hooks/use-theme';
import { Button } from './button';
import { Chip } from './chip';
import { TextField } from './text-field';
import { ThemedText } from './themed-text';

type Mode = 'signIn' | 'signUp';

const MIN_PASSWORD = 8;

/** Sign in, or create an account, with email and password. */
export function AuthScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setMessage({ text: 'Enter your email address.', error: true });
      return;
    }
    if (mode === 'signUp' && password.length < MIN_PASSWORD) {
      setMessage({
        text: `Use at least ${MIN_PASSWORD} characters for the password.`,
        error: true,
      });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'signIn') await signIn(address, password);
      else if (!(await signUp(address, password))) {
        setMode('signIn');
        setMessage({
          text: 'Check your email to confirm the account, then sign in.',
          error: false,
        });
      }
    } catch (error) {
      setMessage({
        text:
          error instanceof AccountError
            ? error.message
            : "Couldn't reach the server. Check your connection and try again.",
        error: true,
      });
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
              Forkcast
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Plan meals together and keep track of what you eat.
            </ThemedText>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Sign in" selected={mode === 'signIn'} onPress={() => setMode('signIn')} />
            <Chip
              label="Create account"
              selected={mode === 'signUp'}
              onPress={() => setMode('signUp')}
            />
          </View>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextField
            label="Password"
            hint={mode === 'signUp' ? `At least ${MIN_PASSWORD} characters` : undefined}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
            textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
            onSubmitEditing={submit}
          />
          {message ? (
            <ThemedText
              accessibilityRole={message.error ? 'alert' : undefined}
              type="small"
              style={{ color: message.error ? theme.accent : theme.herb }}>
              {message.text}
            </ThemedText>
          ) : null}
          <Button
            title={busy ? 'Please wait…' : mode === 'signIn' ? 'Sign in' : 'Create account'}
            onPress={busy ? undefined : submit}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
