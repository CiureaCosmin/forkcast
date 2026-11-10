import { addDays, toISODate } from '@/lib/stats';
import type { Meal, MealType, Person, Recipe } from '@/types/models';

const first: Person = { id: 'person-1', name: 'Cosmin' };
const second: Person = { id: 'person-2', name: 'Partner' };
/** Local mode's fixed people. With a backend, the household's members replace them. */
export const people = [first, second];

const createdAt = '2026-11-04T00:00:00.000Z';
const updatedAt = createdAt;

export const sampleRecipes: Recipe[] = [
  {
    id: 'ciorba',
    name: 'Ciorbă de perișoare',
    prepMinutes: 50,
    tags: ['Soup'],
    ingredients: [],
    steps: [],
    createdAt,
    updatedAt,
  },
  {
    id: 'greek-salad',
    name: 'Greek salad with feta',
    prepMinutes: 15,
    tags: ['Quick', 'Vegetarian'],
    ingredients: [],
    steps: [],
    createdAt,
    updatedAt,
  },
  {
    id: 'shawarma',
    name: 'Chicken shawarma bowls',
    prepMinutes: 35,
    tags: ['Quick'],
    ingredients: [],
    steps: [],
    createdAt,
    updatedAt,
  },
  {
    id: 'pasta-fagioli',
    name: 'Pasta e fagioli',
    prepMinutes: 30,
    tags: ['Soup', 'Quick'],
    ingredients: [],
    steps: [],
    createdAt,
    updatedAt,
  },
  {
    id: 'risotto',
    name: 'Mushroom risotto',
    prepMinutes: 40,
    tags: ['Vegetarian'],
    ingredients: [],
    steps: [],
    createdAt,
    updatedAt,
  },
  {
    id: 'sarmale',
    name: 'Sarmale',
    prepMinutes: 180,
    tags: ['Weekend'],
    ingredients: [],
    steps: [],
    createdAt,
    updatedAt,
  },
];

type Entry = [recipeId: string, mealType: MealType, daysAgo: number];

// Meal dates are offsets from the real current date, so the Plan screen always has meals for
// today and tomorrow, whatever day the app is opened.
const eatenEntries: Entry[] = [
  ...[6, 13, 20, 27, 34, 41, 48, 55, 62].map((d): Entry => ['ciorba', 'dinner', d]),
  ...[1, 2, 8, 15, 22, 29, 36, 43].map((d): Entry => ['greek-salad', 'lunch', d]),
  ...[2, 9, 16, 23, 30, 37, 44].map((d): Entry => ['shawarma', 'dinner', d]),
  ...[10, 17, 24, 31, 38, 45].map((d): Entry => ['pasta-fagioli', 'lunch', d]),
  ...[21, 35, 49, 63, 77].map((d): Entry => ['risotto', 'dinner', d]),
  ...[60, 74, 88, 102].map((d): Entry => ['sarmale', 'dinner', d]),
];
const skippedEntries: Entry[] = [
  ['pasta-fagioli', 'dinner', 1],
  ['shawarma', 'lunch', 5],
  ['greek-salad', 'dinner', 12],
];
const plannedEntries: Entry[] = [
  ['pasta-fagioli', 'lunch', 0],
  ['risotto', 'dinner', 0],
  ['ciorba', 'dinner', -1],
];
const partnerEntries: Entry[] = [
  ['greek-salad', 'lunch', 1],
  ['shawarma', 'dinner', 2],
  ['risotto', 'dinner', 9],
];
const partnerPlanned: Entry[] = [
  ['shawarma', 'lunch', 0],
  ['ciorba', 'dinner', -1],
];

export function buildSampleMeals(now: Date = new Date()): Meal[] {
  const today = toISODate(now);
  const build = (entries: Entry[], status: Meal['status'], person = first): Meal[] =>
    entries.map(([recipeId, mealType, daysAgo]) => ({
      id: `${person.id}-${status}-${recipeId}-${daysAgo}-${mealType}`,
      personId: person.id,
      recipeId,
      date: addDays(today, -daysAgo),
      mealType,
      status,
      isLeftovers: false,
      updatedAt,
    }));
  const skipped = build(skippedEntries, 'skipped').map((meal) =>
    meal.recipeId === 'pasta-fagioli' ? { ...meal, notes: 'ate out' } : meal,
  );
  const leftovers = build([['ciorba', 'lunch', 5]], 'eaten').map((meal) => ({
    ...meal,
    isLeftovers: true,
  }));
  const eatingOut: Meal = {
    id: 'eaten-eating-out',
    personId: first.id,
    quickType: 'eating_out',
    date: addDays(today, -3),
    mealType: 'dinner',
    status: 'eaten',
    isLeftovers: false,
    updatedAt,
  };
  return [
    ...build(eatenEntries, 'eaten'),
    ...leftovers,
    eatingOut,
    ...skipped,
    ...build(plannedEntries, 'planned'),
    ...build(partnerEntries, 'eaten', second),
    ...build(partnerPlanned, 'planned', second),
  ];
}
