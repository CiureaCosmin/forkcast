import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { useSyncExternalStore } from 'react';

import { hasSameMeal, partnerOf } from '@/lib/meals';
import type { RecipeFields } from '@/lib/recipes';
import { addDays } from '@/lib/stats';
import { isBackendConfigured } from '@/lib/supabase';
import type { OutboxEntry } from '@/lib/sync';
import type { Meal, MealStatus, MealType, Person, QuickMealType, Recipe } from '@/types/models';
import { buildSampleMeals, people as samplePeople, sampleRecipes } from './sample';

export const KEYS = {
  recipes: 'forkcast:recipes:v1',
  meals: 'forkcast:meals:v1',
  /** Local mode: which of the fixed people uses this device. */
  me: 'forkcast:me:v1',
  /** Backend mode: the signed-in account and its household's people, so the app opens offline. */
  account: 'forkcast:account:v1',
};

/** The signed-in user and their household, once they've created or joined one. */
export type Account = {
  userId: string;
  email: string;
  household?: { id: string; name: string; inviteCode: string };
};

export type SyncState = {
  status: 'idle' | 'syncing' | 'offline' | 'error' | 'signedOut';
  /** Changes on this device that haven't reached the server yet. */
  pending: number;
  lastSyncedAt?: string;
};

type StoreState = {
  status: 'loading' | 'ready' | 'error';
  /** `local`: device only, with fixed people. `backend`: signed in and synced with Supabase. */
  mode: 'local' | 'backend';
  /** The household's people: the fixed two in local mode, the members in backend mode. */
  people: Person[];
  /** Backend mode only. */
  account: Account | null;
  sync: SyncState;
  /** All recipes, archived ones included: meals still need to show their names. */
  recipes: Recipe[];
  /** Every person's meals. */
  meals: Meal[];
  /** Who uses this device, until they've chosen. */
  me: string | null;
  /** Whose plan and history are on screen. */
  viewing: string;
  /** The last meal change didn't reach storage. */
  saveFailed: boolean;
};

let state: StoreState = {
  status: 'loading',
  mode: isBackendConfigured() ? 'backend' : 'local',
  people: [],
  account: null,
  sync: { status: 'idle', pending: 0 },
  recipes: [],
  meals: [],
  me: null,
  viewing: '',
  saveFailed: false,
};
const listeners = new Set<() => void>();

function setState(changes: Partial<StoreState>) {
  state = { ...state, ...changes };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getState = () => state;

export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** The current person. The root layout only shows the app once someone has been chosen. */
export function useMe(): string {
  const { me } = useStore();
  if (!me) throw new Error('useMe was called before a person was chosen');
  return me;
}

function readJson<T>(stored: string | null): T | null {
  return stored === null ? null : (JSON.parse(stored) as T);
}

function readList<T>(stored: string | null, fallback: () => T[]): T[] {
  const list: unknown = stored === null ? fallback() : JSON.parse(stored);
  if (!Array.isArray(list)) throw new Error('Saved data is not a list');
  return list;
}

/**
 * Reads the saved data. In local mode the first launch starts from the samples; in backend mode
 * it starts empty, because the data comes from the household. Unreadable data ends in the `error`
 * state rather than a fresh start, so the next save can't overwrite it.
 */
export async function loadData(): Promise<void> {
  setState({ status: 'loading' });
  try {
    const [recipes, meals, me, account] = await Promise.all([
      AsyncStorage.getItem(KEYS.recipes),
      AsyncStorage.getItem(KEYS.meals),
      AsyncStorage.getItem(KEYS.me),
      AsyncStorage.getItem(KEYS.account),
    ]);
    const backend = state.mode === 'backend';
    const saved = backend ? readJson<{ account: Account; people: Person[] }>(account) : null;
    const people = backend ? (saved?.people ?? []) : samplePeople;
    const person = backend
      ? saved?.account.household
        ? saved.account.userId
        : null
      : (people.find((other) => other.id === me)?.id ?? null);
    setState({
      status: 'ready',
      people,
      account: saved?.account ?? null,
      // Recipes saved before `updatedAt` existed fall back to their creation time.
      recipes: readList<Recipe>(recipes, () => (backend ? [] : sampleRecipes)).map((recipe) => ({
        ...recipe,
        updatedAt: recipe.updatedAt ?? recipe.createdAt,
      })),
      meals: readList<Meal>(meals, () => (backend ? [] : buildSampleMeals())),
      me: person,
      viewing: person ?? '',
    });
  } catch (error) {
    console.error('Could not load saved data', error);
    setState({ status: 'error', recipes: [], meals: [] });
  }
}

// Saves run one at a time, each on the latest state. Otherwise two quick taps would both start
// from the same list, and the second write would drop the first change.
let queue: Promise<unknown> = Promise.resolve();

function enqueue(task: () => Promise<void>): Promise<void> {
  const run = queue.then(task);
  queue = run.catch(() => {});
  return run;
}

// Every saved change is also handed to the sync engine (src/data/sync.ts), which registers here
// so this module doesn't import it.
type ChangeHandler = (entries: OutboxEntry[]) => Promise<void>;
let onChange: ChangeHandler | null = null;

export function setChangeHandler(handler: ChangeHandler | null) {
  onChange = handler;
}

/** What changed between two versions of a list: new or edited records, and removed ones. */
function changesBetween<T extends Recipe | Meal>(
  table: OutboxEntry['table'],
  before: T[],
  after: T[],
): OutboxEntry[] {
  const now = new Date().toISOString();
  const old = new Map(before.map((record) => [record.id, record]));
  const kept = new Set(after.map((record) => record.id));
  const entries = after
    .filter((record) => old.get(record.id)?.updatedAt !== record.updatedAt)
    .map((record) => ({ table, record }));
  const removed = before
    .filter((record) => !kept.has(record.id))
    .map((record) => ({ table, record: { ...record, updatedAt: now }, deletedAt: now }));
  return [...entries, ...removed] as OutboxEntry[];
}

async function handOver(entries: OutboxEntry[]) {
  if (!onChange || entries.length === 0) return;
  try {
    await onChange(entries);
  } catch (error) {
    console.error('Could not queue the change for syncing', error);
  }
}

/** Writes first, so the UI never shows a change that wasn't saved. Failures reject. */
function saveRecipes(change: (recipes: Recipe[]) => Recipe[]): Promise<void> {
  return enqueue(async () => {
    const before = state.recipes;
    const recipes = change(before);
    await AsyncStorage.setItem(KEYS.recipes, JSON.stringify(recipes));
    setState({ recipes });
    await handOver(changesBetween('recipes', before, recipes));
  });
}

/** Writes first, like `saveRecipes`. Failures show the app-wide banner, so callers needn't wait. */
function saveMeals(change: (meals: Meal[]) => Meal[]): Promise<void> {
  return enqueue(async () => {
    try {
      const before = state.meals;
      const meals = change(before);
      await AsyncStorage.setItem(KEYS.meals, JSON.stringify(meals));
      setState({ meals, saveFailed: false });
      await handOver(changesBetween('meals', before, meals));
    } catch (error) {
      console.error('Could not save meals', error);
      setState({ saveFailed: true });
    }
  });
}

export async function createRecipe(fields: RecipeFields): Promise<void> {
  const now = new Date().toISOString();
  const recipe: Recipe = { ...fields, id: randomUUID(), createdAt: now, updatedAt: now };
  await saveRecipes((recipes) => [recipe, ...recipes]);
}

export async function updateRecipe(id: string, fields: RecipeFields): Promise<void> {
  const updatedAt = new Date().toISOString();
  await saveRecipes((recipes) =>
    recipes.map((recipe) => (recipe.id === id ? { ...recipe, ...fields, updatedAt } : recipe)),
  );
}

/** Removes the recipe, or archives it if anyone's meal uses it, so history stays intact. */
export async function deleteRecipe(id: string): Promise<void> {
  const now = new Date().toISOString();
  const hasMeals = state.meals.some((meal) => meal.recipeId === id);
  await saveRecipes((recipes) =>
    hasMeals
      ? recipes.map((recipe) =>
          recipe.id === id ? { ...recipe, archivedAt: now, updatedAt: now } : recipe,
        )
      : recipes.filter((recipe) => recipe.id !== id),
  );
}

export async function addMeal(
  meal: Pick<Meal, 'date' | 'mealType' | 'status'> &
    ({ recipeId: string } | { quickType: QuickMealType }),
): Promise<void> {
  const { me } = state;
  if (!me) return;
  const added = {
    ...meal,
    id: randomUUID(),
    personId: me,
    isLeftovers: false,
    updatedAt: new Date().toISOString(),
  } as Meal;
  await saveMeals((meals) => [...meals, added]);
}

export async function setMealStatus(id: string, status: MealStatus): Promise<void> {
  const updatedAt = new Date().toISOString();
  await saveMeals((meals) =>
    meals.map((meal) => (meal.id === id ? { ...meal, status, updatedAt } : meal)),
  );
}

export async function removeMeal(id: string): Promise<void> {
  await saveMeals((meals) => meals.filter((meal) => meal.id !== id));
}

function copyOf(meal: Meal, changes: Pick<Meal, 'personId' | 'date' | 'mealType'>): Meal {
  return {
    ...meal,
    ...changes,
    id: randomUUID(),
    status: 'planned',
    notes: undefined,
    updatedAt: new Date().toISOString(),
  };
}

/** Puts a planned copy on the partner's plan, for them to mark. Does nothing if they have it. */
export async function copyToPartner(meal: Meal): Promise<void> {
  const partner = partnerOf(state.people, meal.personId);
  if (!partner) return;
  const copy = copyOf(meal, { ...meal, personId: partner.id });
  await saveMeals((meals) => (hasSameMeal(meals, copy) ? meals : [...meals, copy]));
}

/** Plans the rest of a recipe for the next day. It counts as last eaten, not as cooked again. */
export async function planLeftovers(meal: Meal, mealType: MealType): Promise<void> {
  const copy = {
    ...copyOf(meal, { ...meal, date: addDays(meal.date, 1), mealType }),
    isLeftovers: true,
  };
  await saveMeals((meals) => (hasSameMeal(meals, copy) ? meals : [...meals, copy]));
}

/** Local mode: remembers which of the fixed people uses this device. */
export async function chooseMe(id: string): Promise<void> {
  setState({ me: id, viewing: id });
  try {
    await AsyncStorage.setItem(KEYS.me, id);
  } catch (error) {
    console.error('Could not remember who is using this device', error);
  }
}

export function viewPerson(id: string) {
  setState({ viewing: id });
}

/**
 * For the sync engine and the account module only: they replace data that came from the server,
 * without handing it back to be synced.
 */
export const storeInternals = {
  getState,
  setState,
  enqueue,
  async writeData(changes: { recipes?: Recipe[]; meals?: Meal[] }) {
    await Promise.all([
      changes.recipes && AsyncStorage.setItem(KEYS.recipes, JSON.stringify(changes.recipes)),
      changes.meals && AsyncStorage.setItem(KEYS.meals, JSON.stringify(changes.meals)),
    ]);
    setState(changes);
  },
  async writeAccount(account: Account | null, people: Person[]) {
    if (account) await AsyncStorage.setItem(KEYS.account, JSON.stringify({ account, people }));
    else await AsyncStorage.removeItem(KEYS.account);
    const person = account?.household ? account.userId : null;
    setState({
      account,
      people,
      me: person,
      viewing:
        state.viewing && people.some((p) => p.id === state.viewing)
          ? state.viewing
          : (person ?? ''),
    });
  },
};
