import type { Meal, MealType, Recipe } from '@/types/models';

const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner'];

// Dates are local calendar days stored as `YYYY-MM-DD`. They are parsed at local noon so that
// daylight saving changes never shift the day.
export function parseDate(iso: string): Date {
  const [y = 1970, m = 1, d = 1] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  const date = parseDate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / DAY_MS);
}

/** "today", "yesterday", "6 days ago", "3 weeks ago", "2 months ago". */
export function agoLabel(iso: string, today: string): string {
  const days = daysBetween(iso, today);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

/** "Tue 3 Nov". */
export function shortDateLabel(iso: string): string {
  const date = parseDate(iso);
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "Wednesday, 4 November". */
export function longDateLabel(iso: string): string {
  const date = parseDate(iso);
  return `${WEEKDAYS_LONG[date.getDay()]}, ${date.getDate()} ${MONTHS_LONG[date.getMonth()]}`;
}

/** "15 min", "3 h", "1 h 30 min". */
export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function initials(name: string): string {
  const words = name.split(/\s+/).filter((word) => word.length > 2);
  const [first = name.trim(), second = ''] = words;
  return (second ? first.charAt(0) + second.charAt(0) : first.slice(0, 2)).toUpperCase();
}

/** Monday to Sunday of the week containing `iso`. */
export function weekDates(iso: string): string[] {
  const offsetFromMonday = (parseDate(iso).getDay() + 6) % 7;
  const monday = addDays(iso, -offsetFromMonday);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function mealsOnDate(meals: Meal[], date: string): Meal[] {
  return meals
    .filter((meal) => meal.date === date)
    .sort((a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType));
}

/** How often a recipe was made: leftovers of an earlier cooking don't count. */
export function timesEaten(recipeId: string, meals: Meal[]): number {
  return meals.filter(
    (meal) => meal.recipeId === recipeId && meal.status === 'eaten' && !meal.isLeftovers,
  ).length;
}

/** Date of the most recent eaten meal of a recipe, if any. Leftovers count: it was still eaten. */
export function lastEaten(recipeId: string, meals: Meal[]): string | undefined {
  return meals
    .filter((meal) => meal.recipeId === recipeId && meal.status === 'eaten')
    .map((meal) => meal.date)
    .sort()
    .at(-1);
}

/** Eaten and skipped meals in the 30 days up to and including `today`. */
export function last30DaysCounts(meals: Meal[], today: string): { eaten: number; skipped: number } {
  const recent = meals.filter((meal) => {
    const age = daysBetween(meal.date, today);
    return age >= 0 && age < 30;
  });
  return {
    eaten: recent.filter((meal) => meal.status === 'eaten').length,
    skipped: recent.filter((meal) => meal.status === 'skipped').length,
  };
}

export function mostEaten(
  recipes: Recipe[],
  meals: Meal[],
): { recipe: Recipe; count: number } | undefined {
  let best: { recipe: Recipe; count: number } | undefined;
  for (const recipe of recipes) {
    const count = timesEaten(recipe.id, meals);
    if (count > 0 && (!best || count > best.count)) best = { recipe, count };
  }
  return best;
}

/** The recipe that was eaten the longest ago (never-eaten recipes are skipped). */
export function haventHadInAWhile(
  recipes: Recipe[],
  meals: Meal[],
): { recipe: Recipe; lastDate: string } | undefined {
  let oldest: { recipe: Recipe; lastDate: string } | undefined;
  for (const recipe of recipes) {
    const lastDate = lastEaten(recipe.id, meals);
    if (lastDate && (!oldest || lastDate < oldest.lastDate)) oldest = { recipe, lastDate };
  }
  return oldest;
}

/** Eaten and skipped meals up to and including `today`, grouped by day, newest first. */
export function historyByDay(meals: Meal[], today: string): { date: string; meals: Meal[] }[] {
  const dates = [
    ...new Set(
      meals.filter((meal) => meal.status !== 'planned' && meal.date <= today).map((m) => m.date),
    ),
  ];
  return dates
    .sort()
    .reverse()
    .map((date) => ({
      date,
      meals: mealsOnDate(meals, date).filter((meal) => meal.status !== 'planned'),
    }));
}
