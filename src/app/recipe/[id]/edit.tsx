import { useLocalSearchParams } from 'expo-router';

import { RecipeForm } from '@/components/recipe-form';
import { RecipeNotFound } from '@/components/recipe-not-found';
import { updateRecipe, useStore } from '@/data/store';
import { activeRecipes, draftFromRecipe, tagsOf } from '@/lib/recipes';

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipes = activeRecipes(useStore().recipes);
  const recipe = recipes.find((other) => other.id === id);
  if (!recipe) return <RecipeNotFound />;

  return (
    <RecipeForm
      initial={draftFromRecipe(recipe)}
      knownTags={tagsOf(recipes)}
      onSave={(fields) => updateRecipe(recipe.id, fields)}
    />
  );
}
