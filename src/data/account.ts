import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

import { supabase } from '@/lib/supabase';
import { prepareImport } from '@/lib/sync';
import type { Person } from '@/types/models';
import { type Account, KEYS, storeInternals } from './store';
import { queueAll, resetSync, syncNow } from './sync';

const { getState, enqueue, writeAccount, writeData } = storeInternals;

/** A failure worth showing as is: Supabase's auth and database messages are written for people. */
export class AccountError extends Error {}

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new AccountError(error.message);
}

export async function signIn(email: string, password: string): Promise<void> {
  const { data, error } = await supabase().auth.signInWithPassword({ email, password });
  fail(error);
  await afterSignIn(data.user.id, data.user.email ?? email);
}

/**
 * Creates the account. Returns `false` when the project asks people to confirm their email
 * first: there's no session until they've clicked the link and signed in.
 */
export async function signUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await supabase().auth.signUp({ email, password });
  fail(error);
  if (!data.session || !data.user) return false;
  await afterSignIn(data.user.id, data.user.email ?? email);
  return true;
}

/** Remembers the user and, if they already belong to a household, loads it. */
async function afterSignIn(userId: string, email: string) {
  const household = await fetchHousehold();
  await writeAccount({ userId, email, household: household?.household }, household?.people ?? []);
  if (household) {
    // Data on this device from before belongs to nobody's household; the household's comes next.
    await enqueue(() => writeData({ recipes: [], meals: [] }));
    await resetSync();
    await syncNow();
  }
}

type HouseholdRow = { id: string; name: string; invite_code: string };

const toHousehold = (row: HouseholdRow): NonNullable<Account['household']> => ({
  id: row.id,
  name: row.name,
  inviteCode: row.invite_code,
});

/** The signed-in user's household and its people, or null if they haven't joined one. */
export async function fetchHousehold(): Promise<{
  household: NonNullable<Account['household']>;
  people: Person[];
} | null> {
  const client = supabase();
  const [households, members] = await Promise.all([
    client.from('households').select('id, name, invite_code').maybeSingle(),
    client.from('household_members').select('user_id, display_name').order('joined_at'),
  ]);
  fail(households.error);
  fail(members.error);
  if (!households.data) return null;
  return {
    household: toHousehold(households.data),
    people: (members.data ?? []).map((member) => ({
      id: member.user_id,
      name: member.display_name,
    })),
  };
}

/**
 * Starts a household. The recipes and meals already on this device move into it, so nothing
 * typed in before signing up is lost.
 */
export async function createHousehold(householdName: string, displayName: string): Promise<void> {
  const account = getState().account;
  if (!account) throw new AccountError('Sign in first.');
  const { data, error } = await supabase().rpc('create_household', {
    household_name: householdName.trim(),
    display_name: displayName.trim(),
  });
  fail(error);
  const localPerson = await AsyncStorage.getItem(KEYS.me);
  await enqueue(async () => {
    const { recipes, meals } = prepareImport(
      getState().recipes,
      getState().meals,
      localPerson,
      account.userId,
      randomUUID,
    );
    await writeData({ recipes, meals });
    await resetSync();
    await queueAll({ recipes, meals });
  });
  await writeAccount({ ...account, household: toHousehold(data) }, [
    { id: account.userId, name: displayName.trim() },
  ]);
  await syncNow();
}

/** Joins the partner's household. This device then shows that household's recipes and meals. */
export async function joinHousehold(code: string, displayName: string): Promise<void> {
  const account = getState().account;
  if (!account) throw new AccountError('Sign in first.');
  const { error } = await supabase().rpc('join_household', {
    code: code.trim(),
    display_name: displayName.trim(),
  });
  fail(error);
  const household = await fetchHousehold();
  if (!household) throw new AccountError("Couldn't load the household. Please try again.");
  await enqueue(() => writeData({ recipes: [], meals: [] }));
  await resetSync();
  await writeAccount({ ...account, household: household.household }, household.people);
  await syncNow();
}

/** Signs out and clears this device's copy of the household's data, unsynced changes included. */
export async function signOut(): Promise<void> {
  try {
    await supabase().auth.signOut();
  } catch (error) {
    // Offline: the session is still cleared on this device.
    console.error('Could not sign out on the server', error);
  }
  await enqueue(() => writeData({ recipes: [], meals: [] }));
  await resetSync();
  await AsyncStorage.removeItem(KEYS.me);
  await writeAccount(null, []);
}

/**
 * Signs the same user in again after their session ended on the server, keeping this device's
 * data and unsynced changes.
 */
export async function signInAgain(password: string): Promise<void> {
  const account = getState().account;
  if (!account) throw new AccountError('Sign in first.');
  const { data, error } = await supabase().auth.signInWithPassword({
    email: account.email,
    password,
  });
  fail(error);
  if (data.user.id !== account.userId) {
    await supabase().auth.signOut();
    throw new AccountError('That is a different account.');
  }
  await syncNow();
}
