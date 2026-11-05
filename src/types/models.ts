export type MealType = 'breakfast' | 'lunch' | 'dinner';
export type MealStatus = 'planned' | 'eaten' | 'skipped';
export type QuickMealType = 'eating_out' | 'takeout' | 'quick_bite';

export type Person = {
  id: string;
  name: string;
};

export type Ingredient = {
  name: string;
  quantity?: number;
  unit?: string;
};

export type Recipe = {
  id: string;
  name: string;
  description?: string;
  ingredients: Ingredient[];
  steps: string[];
  prepMinutes?: number;
  tags: string[];
  photoUrl?: string;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp of the last change. */
  updatedAt: string;
  /** ISO timestamp. Archived recipes are hidden, but their meals keep their history. */
  archivedAt?: string;
};

/** A meal comes from either a saved recipe or a quick category, never both. */
export type Meal = {
  id: string;
  personId: string;
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  mealType: MealType;
  status: MealStatus;
  isLeftovers: boolean;
  /** ISO timestamp of the last change. */
  updatedAt: string;
  notes?: string;
} & (
  | { recipeId: string; quickType?: undefined }
  | { quickType: QuickMealType; recipeId?: undefined }
);
