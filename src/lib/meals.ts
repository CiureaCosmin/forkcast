import type { Meal, MealStatus, MealType, Person, QuickMealType, Recipe } from '@/types/models';

const mealTypeLabels: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

const quickMealLabels: Record<QuickMealType, string> = {
  eating_out: 'Eating out',
  takeout: 'Takeout',
  quick_bite: 'Quick bite',
};

export const QUICK_MEALS = Object.keys(quickMealLabels) as QuickMealType[];

export function mealTypeLabel(type: MealType): string {
  return mealTypeLabels[type];
}

export function mealName(meal: Meal, recipes: Recipe[]): string {
  if (meal.quickType) return quickMealLabels[meal.quickType];
  return recipes.find((recipe) => recipe.id === meal.recipeId)?.name ?? 'Unknown recipe';
}

export function quickMealLabel(type: QuickMealType): string {
  return quickMealLabels[type];
}

export function mealsFor(meals: Meal[], personId: string): Meal[] {
  return meals.filter((meal) => meal.personId === personId);
}

/** Past planned meals nobody marked, oldest first. They don't count until someone does. */
export function mealsToReview(meals: Meal[], today: string): Meal[] {
  return meals
    .filter((meal) => meal.status === 'planned' && meal.date < today)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Whether that person already has this dish in that slot. */
export function hasSameMeal(meals: Meal[], meal: Meal): boolean {
  return meals.some(
    (other) =>
      other.personId === meal.personId &&
      other.date === meal.date &&
      other.mealType === meal.mealType &&
      other.recipeId === meal.recipeId &&
      other.quickType === meal.quickType,
  );
}

/** A past meal was eaten and a future one is planned. Only today can be either. */
export function statusFor(date: string, today: string, eatenToday: boolean): MealStatus {
  if (date < today) return 'eaten';
  if (date > today) return 'planned';
  return eatenToday ? 'eaten' : 'planned';
}

/** The other person in the household, if they've joined. */
export function partnerOf(people: Person[], personId: string): Person | undefined {
  return people.find((person) => person.id !== personId);
}
