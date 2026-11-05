import type { Recipe } from '@/types/models';

/** What the recipe form edits. Everything is text until it is parsed on save. */
export type RecipeDraft = {
  name: string;
  description: string;
  prepMinutes: string;
  tags: string[];
  ingredients: string;
  steps: string;
};

export type RecipeFields = Pick<
  Recipe,
  'name' | 'description' | 'prepMinutes' | 'tags' | 'ingredients' | 'steps'
>;

export type RecipeDraftErrors = { name?: string; prepMinutes?: string };

export const emptyDraft: RecipeDraft = {
  name: '',
  description: '',
  prepMinutes: '',
  tags: [],
  ingredients: '',
  steps: '',
};

function lines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/** "200 g flour". */
export function ingredientLabel({ name, quantity, unit }: Recipe['ingredients'][number]): string {
  return [quantity, unit, name].filter((part) => part !== undefined).join(' ');
}

export function draftFromRecipe(recipe: Recipe): RecipeDraft {
  return {
    name: recipe.name,
    description: recipe.description ?? '',
    prepMinutes: recipe.prepMinutes === undefined ? '' : String(recipe.prepMinutes),
    tags: recipe.tags,
    ingredients: recipe.ingredients.map(ingredientLabel).join('\n'),
    steps: recipe.steps.join('\n'),
  };
}

export function parseDraft(
  draft: RecipeDraft,
):
  | { fields: RecipeFields; errors?: undefined }
  | { errors: RecipeDraftErrors; fields?: undefined } {
  const errors: RecipeDraftErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = 'Give the recipe a name.';

  const prep = draft.prepMinutes.trim();
  if (prep && (!/^\d+$/.test(prep) || Number(prep) === 0)) {
    errors.prepMinutes = 'Enter the prep time in whole minutes.';
  }
  if (errors.name || errors.prepMinutes) return { errors };

  return {
    fields: {
      name,
      description: draft.description.trim() || undefined,
      prepMinutes: prep ? Number(prep) : undefined,
      tags: draft.tags,
      ingredients: lines(draft.ingredients).map((line) => ({ name: line })),
      steps: lines(draft.steps),
    },
  };
}

/** Adds `tag`, unless it is blank or already there in any casing. */
export function addTag(tags: string[], tag: string): string[] {
  const clean = tag.trim();
  const exists = tags.some((other) => other.toLowerCase() === clean.toLowerCase());
  return clean && !exists ? [...tags, clean] : tags;
}

export function activeRecipes(recipes: Recipe[]): Recipe[] {
  return recipes.filter((recipe) => !recipe.archivedAt);
}

export function tagsOf(recipes: Recipe[]): string[] {
  return [...new Set(recipes.flatMap((recipe) => recipe.tags))];
}
