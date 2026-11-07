import type { Database } from '@/types/database';
import type { Ingredient, Meal, Recipe } from '@/types/models';

type Tables = Database['public']['Tables'];
export type RecipeRow = Tables['recipes']['Row'];
export type MealRow = Tables['meals']['Row'];
type RecipeInsert = Tables['recipes']['Insert'];
type MealInsert = Tables['meals']['Insert'];

/**
 * A change waiting to reach the server. It holds the whole record, so a row made and changed
 * offline can still be inserted. A deletion keeps the last record and sets `deletedAt`.
 */
export type OutboxEntry =
  | { table: 'recipes'; record: Recipe; deletedAt?: string }
  | { table: 'meals'; record: Meal; deletedAt?: string };

/** Adds a change, replacing any earlier one for the same row: only the latest state is sent. */
export function addToOutbox(outbox: OutboxEntry[], entry: OutboxEntry): OutboxEntry[] {
  return [
    ...outbox.filter((other) => other.table !== entry.table || other.record.id !== entry.record.id),
    entry,
  ];
}

/**
 * Removes the entries that were sent, unless the row changed again while they were on the way.
 */
export function removeSent(outbox: OutboxEntry[], sent: OutboxEntry[]): OutboxEntry[] {
  return outbox.filter(
    (entry) =>
      !sent.some(
        (done) =>
          done.table === entry.table &&
          done.record.id === entry.record.id &&
          done.record.updatedAt === entry.record.updatedAt &&
          done.deletedAt === entry.deletedAt,
      ),
  );
}

export function pendingIds(outbox: OutboxEntry[], table: OutboxEntry['table']): Set<string> {
  return new Set(outbox.filter((entry) => entry.table === table).map((entry) => entry.record.id));
}

// Rows and records -------------------------------------------------------------------------------

const orUndefined = <T>(value: T | null): T | undefined => (value === null ? undefined : value);

export function recipeToRow(recipe: Recipe, householdId: string, deletedAt?: string): RecipeInsert {
  return {
    id: recipe.id,
    household_id: householdId,
    name: recipe.name,
    description: recipe.description ?? null,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    prep_minutes: recipe.prepMinutes ?? null,
    tags: recipe.tags,
    photo_url: recipe.photoUrl ?? null,
    archived_at: recipe.archivedAt ?? null,
    created_at: recipe.createdAt,
    updated_at: recipe.updatedAt,
    deleted_at: deletedAt ?? null,
  };
}

export function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    name: row.name,
    description: orUndefined(row.description),
    ingredients: (row.ingredients ?? []) as Ingredient[],
    steps: (row.steps ?? []) as string[],
    prepMinutes: orUndefined(row.prep_minutes),
    tags: row.tags,
    photoUrl: orUndefined(row.photo_url),
    archivedAt: orUndefined(row.archived_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mealToRow(meal: Meal, householdId: string, deletedAt?: string): MealInsert {
  return {
    id: meal.id,
    household_id: householdId,
    person_id: meal.personId,
    recipe_id: meal.recipeId ?? null,
    quick_type: meal.quickType ?? null,
    date: meal.date,
    meal_type: meal.mealType,
    status: meal.status,
    is_leftovers: meal.isLeftovers,
    notes: meal.notes ?? null,
    updated_at: meal.updatedAt,
    deleted_at: deletedAt ?? null,
  };
}

export function rowToMeal(row: MealRow): Meal {
  const base = {
    id: row.id,
    personId: row.person_id,
    date: row.date,
    mealType: row.meal_type,
    status: row.status,
    isLeftovers: row.is_leftovers,
    notes: orUndefined(row.notes),
    updatedAt: row.updated_at,
  };
  return row.quick_type
    ? { ...base, quickType: row.quick_type }
    : { ...base, recipeId: row.recipe_id ?? '' };
}

// Merging ----------------------------------------------------------------------------------------

/**
 * Applies rows from the server to the device's list. Rows with a change still waiting to be sent
 * are left alone: that change is newer, and the server keeps whichever edit is latest.
 */
export function mergeRemote<T extends { id: string }>(
  local: T[],
  remote: { record: T; deleted: boolean }[],
  pending: Set<string>,
): T[] {
  const byId = new Map(local.map((record) => [record.id, record]));
  for (const { record, deleted } of remote) {
    if (pending.has(record.id)) continue;
    if (deleted) byId.delete(record.id);
    else byId.set(record.id, record);
  }
  return [...byId.values()];
}

/**
 * The cursor for the next pull: the latest server time seen, minus a margin. Rows written in the
 * same instant can commit out of order, and pulling a few twice is harmless.
 */
export function nextCursor(previous: string | undefined, rows: { server_updated_at: string }[]) {
  const latest = rows.reduce<string | undefined>(
    (max, row) => (!max || row.server_updated_at > max ? row.server_updated_at : max),
    undefined,
  );
  if (!latest) return previous;
  return new Date(new Date(latest).getTime() - CURSOR_MARGIN_MS).toISOString();
}

const CURSOR_MARGIN_MS = 5_000;

// Moving local data into a household ------------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Prepares the data saved on this device for a new household: ids that aren't UUIDs (the sample
 * data's) get new ones, and the device person's meals move to the signed-in user. Other people's
 * meals stay behind: they belong to someone without an account yet.
 */
export function prepareImport(
  recipes: Recipe[],
  meals: Meal[],
  localPersonId: string | null,
  userId: string,
  newId: () => string,
): { recipes: Recipe[]; meals: Meal[] } {
  const recipeIds = new Map(
    recipes.map((recipe) => [recipe.id, UUID.test(recipe.id) ? recipe.id : newId()]),
  );
  return {
    recipes: recipes.map((recipe) => ({ ...recipe, id: recipeIds.get(recipe.id) ?? recipe.id })),
    meals: meals
      .filter((meal) => meal.personId === localPersonId || meal.personId === userId)
      .filter((meal) => !meal.recipeId || recipeIds.has(meal.recipeId))
      .map((meal): Meal => {
        const moved = { ...meal, id: UUID.test(meal.id) ? meal.id : newId(), personId: userId };
        return moved.recipeId
          ? { ...moved, recipeId: recipeIds.get(moved.recipeId) ?? moved.recipeId }
          : moved;
      }),
  };
}
