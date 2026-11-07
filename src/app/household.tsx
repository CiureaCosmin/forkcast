import { useState } from 'react';
import { Share, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { StackContent } from '@/components/stack-content';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { AccountError, signInAgain, signOut } from '@/data/account';
import { useStore } from '@/data/store';
import { syncNow } from '@/data/sync';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';

function syncLabel(status: string, pending: number, lastSyncedAt?: string): string {
  const waiting = pending ? ` · ${pending} ${pending === 1 ? 'change' : 'changes'} waiting` : '';
  if (status === 'syncing') return 'Syncing…';
  if (status === 'offline') return `Offline${waiting}`;
  if (status === 'error') return `Couldn't sync${waiting}`;
  if (status === 'signedOut') return `Signed out on the server${waiting}`;
  if (!lastSyncedAt) return `Not synced yet${waiting}`;
  const time = new Date(lastSyncedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `Synced at ${time}${waiting}`;
}

/** The household: invite code, members, sync status and signing out. */
export default function HouseholdScreen() {
  const theme = useTheme();
  const { account, people, sync, me } = useStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const household = account?.household;
  if (!account || !household) {
    return (
      <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', paddingTop: 48 }}>
        Households need an account. This copy of the app runs on this device only.
      </ThemedText>
    );
  }

  const share = () =>
    Share.share({
      message: `Join our household on Forkcast with the invite code ${household.inviteCode}`,
    }).catch(() => {});

  const leave = async () => {
    const lost = sync.pending
      ? ` ${sync.pending} ${sync.pending === 1 ? 'change hasn’t' : 'changes haven’t'} synced and will be lost.`
      : '';
    const ok = await confirm({
      title: 'Sign out?',
      message: `This device's copy of the household's data is removed.${lost}`,
      confirmLabel: 'Sign out',
    });
    if (ok) await signOut();
  };

  const reauthenticate = async () => {
    setError(null);
    try {
      await signInAgain(password);
      setPassword('');
    } catch (failure) {
      setError(
        failure instanceof AccountError ? failure.message : "Couldn't reach the server. Try again.",
      );
    }
  };

  return (
    <StackContent>
      <View style={{ gap: 6 }}>
        <ThemedText type="title" accessibilityRole="header">
          {household.name}
        </ThemedText>
        <ThemedText themeColor="textSecondary">{account.email}</ThemedText>
      </View>

      <Card style={{ padding: 16, gap: 8 }}>
        <ThemedText type="small" themeColor="textSecondary">
          Invite code
        </ThemedText>
        <ThemedText
          type="stat"
          selectable
          accessibilityLabel={`Invite code ${household.inviteCode.split('').join(' ')}`}
          style={{ fontFamily: Fonts.heading, letterSpacing: 4 }}>
          {household.inviteCode}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Your partner signs up, picks "Join with a code" and enters it.
        </ThemedText>
        <Button title="Share the code" variant="secondary" onPress={share} />
      </Card>

      <View style={{ gap: 8 }}>
        <ThemedText type="heading" accessibilityRole="header">
          Members
        </ThemedText>
        <Card style={{ padding: 16, gap: 8 }}>
          {people.map((person) => (
            <ThemedText key={person.id}>
              {person.id === me ? `${person.name} (you)` : person.name}
            </ThemedText>
          ))}
          {people.length < 2 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Nobody else has joined yet.
            </ThemedText>
          ) : null}
        </Card>
      </View>

      <View style={{ gap: 8 }}>
        <ThemedText type="heading" accessibilityRole="header">
          Sync
        </ThemedText>
        <ThemedText
          accessibilityRole="text"
          style={{ color: sync.status === 'error' ? theme.accent : theme.text }}>
          {syncLabel(sync.status, sync.pending, sync.lastSyncedAt)}
        </ThemedText>
        {sync.status === 'signedOut' ? (
          <>
            <TextField
              label="Password"
              hint={`Sign in again as ${account.email} to sync`}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={reauthenticate}
            />
            <Button title="Sign in again" onPress={reauthenticate} />
          </>
        ) : (
          <Button title="Sync now" variant="secondary" onPress={() => void syncNow()} />
        )}
        {error ? (
          <ThemedText accessibilityRole="alert" type="small" style={{ color: theme.accent }}>
            {error}
          </ThemedText>
        ) : null}
      </View>

      <Button title="Sign out" variant="secondary" onPress={leave} />
    </StackContent>
  );
}
