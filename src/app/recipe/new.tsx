import { RecipeForm } from '@/components/recipe-form';
import { createRecipe, useStore } from '@/data/store';
import { activeRecipes, emptyDraft, tagsOf } from '@/lib/recipes';

export default function NewRecipeScreen() {
  const { recipes } = useStore();
  return (
    <RecipeForm
      initial={emptyDraft}
      knownTags={tagsOf(activeRecipes(recipes))}
      onSave={createRecipe}
    />
  );
}
