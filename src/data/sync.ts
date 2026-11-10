import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';

import { isBackendConfigured, supabase } from '@/lib/supabase';
import {
  addToOutbox,
  type MealRow,
  mealToRow,
  mergeRemote,
  nextCursor,
  type OutboxEntry,
  pendingIds,
  type RecipeRow,
  recipeToRow,
  removeSent,
  rowToMeal,
  rowToRecipe,
} from '@/lib/sync';
import type { Meal, Recipe } from '@/types/models';
import { type SyncState, setChangeHandler, storeInternals } from './store';

const { getState, setState, enqueue, writeData, writeAccount } = storeInternals;

const SYNC_KEYS = {
  /** Changes waiting to reach the server. They survive restarts. */
  outbox: 'forkcast:outbox:v1',
  /** Per table, the server time up to which rows have been pulled. */
  cursor: 'forkcast:sync-cursor:v1',
};

type Table = OutboxEntry['table'];
type Cursor = Partial<Record<Table, string>>;

let outbox: OutboxEntry[] = [];
let cursor: Cursor = {};
let loaded: Promise<void> | undefined;

/** Reads the outbox and cursor once. Everything that touches them waits for this first. */
function ensureLoaded(): Promise<void> {
  loaded ??= (async () => {
    const [savedOutbox, savedCursor] = await Promise.all([
      AsyncStorage.getItem(SYNC_KEYS.outbox),
      AsyncStorage.getItem(SYNC_KEYS.cursor),
    ]);
    outbox = savedOutbox ? JSON.parse(savedOutbox) : [];
    cursor = savedCursor ? JSON.parse(savedCursor) : {};
    setSync({});
  })();
  return loaded;
}

async function saveOutbox() {
  await AsyncStorage.setItem(SYNC_KEYS.outbox, JSON.stringify(outbox));
  setSync({});
}

async function saveCursor() {
  await AsyncStorage.setItem(SYNC_KEYS.cursor, JSON.stringify(cursor));
}

function setSync(changes: Partial<SyncState>) {
  setState({ sync: { ...getState().sync, ...changes, pending: outbox.length } });
}

/** Called by the store for every saved change (it runs inside the store's save queue). */
async function queueEntries(entries: OutboxEntry[]) {
  await ensureLoaded();
  for (const entry of entries) outbox = addToOutbox(outbox, entry);
  await saveOutbox();
  scheduleSync();
}

if (isBackendConfigured()) setChangeHandler(queueEntries);

/** Queues every record, for data that moved into a new household. */
export async function queueAll({ recipes, meals }: { recipes: Recipe[]; meals: Meal[] }) {
  await queueEntries([
    ...recipes.map((record): OutboxEntry => ({ table: 'recipes', record })),
    ...meals.map((record): OutboxEntry => ({ table: 'meals', record })),
  ]);
}

/** Forgets queued changes and pulls everything again: after signing in, joining or signing out. */
export async function resetSync() {
  await ensureLoaded();
  outbox = [];
  cursor = {};
  await Promise.all([saveOutbox(), saveCursor()]);
}

// Running a sync ---------------------------------------------------------------------------------

let running: Promise<void> | null = null;
let runAgain = false;

/** Sends queued changes, then pulls the household's. A call during a sync runs once more after. */
export function syncNow(): Promise<void> {
  if (running) {
    runAgain = true;
    return running;
  }
  running = run().finally(() => {
    running = null;
    if (runAgain) {
      runAgain = false;
      void syncNow();
    }
  });
  return running;
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Syncs shortly after a change, so a burst of taps goes out together. */
function scheduleSync() {
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), 1_000);
}

class SyncError extends Error {}

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new SyncError(error.message);
}

const isNetworkError = (error: unknown) =>
  error instanceof Error && /fetch|network|timed? ?out|offline|load failed/i.test(error.message);

async function run() {
  const household = getState().account?.household;
  if (!household) return;
  await ensureLoaded();
  setSync({ status: 'syncing' });
  try {
    const client = supabase();
    const { data } = await client.auth.getSession();
    if (!data.session) {
      setSync({ status: 'signedOut' });
      return;
    }
    await push('recipes', household.id);
    await push('meals', household.id);
    await pull('recipes', household.id);
    await pull('meals', household.id);
    await refreshPeople();
    setSync({ status: 'idle', lastSyncedAt: new Date().toISOString() });
  } catch (error) {
    if (!isNetworkError(error)) console.error('Sync failed', error);
    setSync({ status: isNetworkError(error) ? 'offline' : 'error' });
  }
}

/**
 * Sends the table's queued changes. Recipes go before meals, which point to them. The server
 * ignores an edit older than the one it has; those rows are fetched back, so the device shows
 * what everyone else sees.
 */
async function push(table: Table, householdId: string) {
  const batch = outbox.filter((entry) => entry.table === table);
  if (batch.length === 0) return;
  const client = supabase();
  const sent =
    table === 'recipes'
      ? await client
          .from('recipes')
          .upsert(
            batch.map((entry) => recipeToRow(entry.record as Recipe, householdId, entry.deletedAt)),
          )
          .select('id')
      : await client
          .from('meals')
          .upsert(
            batch.map((entry) => mealToRow(entry.record as Meal, householdId, entry.deletedAt)),
          )
          .select('id');
  fail(sent.error);
  outbox = removeSent(outbox, batch);
  await saveOutbox();

  const accepted = new Set(sent.data.map((row) => row.id));
  const ignored = batch.map((entry) => entry.record.id).filter((id) => !accepted.has(id));
  if (ignored.length > 0) {
    const { data, error } = await client.from(table).select('*').in('id', ignored);
    fail(error);
    await apply(table, data);
  }
}

const PAGE = 500;

/** Pulls the table's rows changed since the last pull, a page at a time. */
async function pull(table: Table, householdId: string) {
  const client = supabase();
  let after: { at: string; id: string } | undefined;
  const since = cursor[table];
  const rows: (RecipeRow | MealRow)[] = [];
  for (;;) {
    let query = client.from(table).select('*').eq('household_id', householdId);
    if (since) query = query.gt('server_updated_at', since);
    // Keyset paging: a big import can give hundreds of rows the same server time.
    if (after) {
      query = query.or(
        `server_updated_at.gt.${after.at},and(server_updated_at.eq.${after.at},id.gt.${after.id})`,
      );
    }
    const { data, error } = await query.order('server_updated_at').order('id').limit(PAGE);
    fail(error);
    rows.push(...data);
    const last = data.at(-1);
    if (!last || data.length < PAGE) break;
    after = { at: last.server_updated_at, id: last.id };
  }
  await apply(table, rows);
  cursor = { ...cursor, [table]: nextCursor(cursor[table], rows) };
  await saveCursor();
}

/** Applies server rows to the device's data, in the store's save queue. */
async function apply(table: Table, rows: (RecipeRow | MealRow)[]) {
  if (rows.length === 0) return;
  await enqueue(async () => {
    const pending = pendingIds(outbox, table);
    if (table === 'recipes') {
      const remote = (rows as RecipeRow[]).map((row) => ({
        record: rowToRecipe(row),
        deleted: !!row.deleted_at,
      }));
      await writeData({ recipes: mergeRemote(getState().recipes, remote, pending) });
    } else {
      const remote = (rows as MealRow[]).map((row) => ({
        record: rowToMeal(row),
        deleted: !!row.deleted_at,
      }));
      await writeData({ meals: mergeRemote(getState().meals, remote, pending) });
    }
  });
}

/** Picks up a partner who joined, or a changed name. */
async function refreshPeople() {
  const { account, people } = getState();
  if (!account) return;
  const { data, error } = await supabase()
    .from('household_members')
    .select('user_id, display_name')
    .order('joined_at');
  fail(error);
  const fresh = data.map((member) => ({ id: member.user_id, name: member.display_name }));
  if (JSON.stringify(fresh) !== JSON.stringify(people)) await writeAccount(account, fresh);
}

// When to sync -----------------------------------------------------------------------------------

const EVERY_MS = 60_000;

/**
 * Syncs now, when the app comes back to the foreground or online, and every minute while open.
 * Returns a function that stops it.
 */
export function startSyncing(): () => void {
  void syncNow();
  const interval = setInterval(() => void syncNow(), EVERY_MS);
  const appState = AppState.addEventListener('change', (next) => {
    if (next === 'active') void syncNow();
  });
  const onWeb = Platform.OS === 'web' && typeof window !== 'undefined';
  const onOnline = () => void syncNow();
  const onVisible = () => {
    if (document.visibilityState === 'visible') void syncNow();
  };
  if (onWeb) {
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
  }
  return () => {
    clearInterval(interval);
    clearTimeout(timer);
    appState.remove();
    if (onWeb) {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    }
  };
}
