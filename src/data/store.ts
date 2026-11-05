import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { useSyncExternalStore } from 'react';

import { hasSameMeal } from '@/lib/meals';
import type { RecipeFields } from '@/lib/recipes';
import { addDays } from '@/lib/stats';
import type { Meal, MealStatus, MealType, QuickMealType, Recipe } from '@/types/models';
import { buildSampleMeals, partnerOf, people, sampleRecipes } from './sample';

const KEYS = {
  recipes: 'forkcast:recipes:v1',
  meals: 'forkcast:meals:v1',
  me: 'forkcast:me:v1',
};

type StoreState = {
  status: 'loading' | 'ready' | 'error';
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

function readList<T>(stored: string | null, fallback: () => T[]): T[] {
  const list: unknown = stored === null ? fallback() : JSON.parse(stored);
  if (!Array.isArray(list)) throw new Error('Saved data is not a list');
  return list;
}

/**
 * Reads the saved data, or starts from the samples on first launch. Unreadable data ends in the
 * `error` state rather than the samples, so the next save can't overwrite it.
 */
export async function loadData(): Promise<void> {
  setState({ status: 'loading' });
  try {
    const [recipes, meals, me] = await Promise.all([
      AsyncStorage.getItem(KEYS.recipes),
      AsyncStorage.getItem(KEYS.meals),
      AsyncStorage.getItem(KEYS.me),
    ]);
    const known = people.find((person) => person.id === me)?.id ?? null;
    setState({
      status: 'ready',
      // Recipes saved before `updatedAt` existed fall back to their creation time.
      recipes: readList<Recipe>(recipes, () => sampleRecipes).map((recipe) => ({
        ...recipe,
        updatedAt: recipe.updatedAt ?? recipe.createdAt,
      })),
      meals: readList<Meal>(meals, buildSampleMeals),
      me: known,
      viewing: known ?? '',
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

/** Writes first, so the UI never shows a change that wasn't saved. Failures reject. */
function saveRecipes(change: (recipes: Recipe[]) => Recipe[]): Promise<void> {
  return enqueue(async () => {
    const recipes = change(state.recipes);
    await AsyncStorage.setItem(KEYS.recipes, JSON.stringify(recipes));
    setState({ recipes });
  });
}

/** Writes first, like `saveRecipes`. Failures show the app-wide banner, so callers needn't wait. */
function saveMeals(change: (meals: Meal[]) => Meal[]): Promise<void> {
  return enqueue(async () => {
    try {
      const meals = change(state.meals);
      await AsyncStorage.setItem(KEYS.meals, JSON.stringify(meals));
      setState({ meals, saveFailed: false });
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
  const copy = copyOf(meal, { ...meal, personId: partnerOf(meal.personId) });
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

/** Remembers who uses this device. */
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
