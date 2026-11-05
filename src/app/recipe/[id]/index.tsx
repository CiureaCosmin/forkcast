import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { RecipeNotFound } from '@/components/recipe-not-found';
import { StackContent } from '@/components/stack-content';
import { ThemedText } from '@/components/themed-text';
import { deleteRecipe, useMe, useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { mealsFor } from '@/lib/meals';
import { activeRecipes, ingredientLabel } from '@/lib/recipes';
import { agoLabel, durationLabel, lastEaten, timesEaten, toISODate } from '@/lib/stats';

export default function RecipeDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [deleteFailed, setDeleteFailed] = useState(false);
  const { recipes, meals } = useStore();
  const myMeals = mealsFor(meals, useMe());
  const recipe = activeRecipes(recipes).find((other) => other.id === id);
  if (!recipe) return <RecipeNotFound />;

  const meta = [recipe.prepMinutes ? durationLabel(recipe.prepMinutes) : null, ...recipe.tags]
    .filter(Boolean)
    .join(' · ');
  const last = lastEaten(recipe.id, myMeals);
  const stats = last
    ? `Eaten ${timesEaten(recipe.id, myMeals)}× · last ${agoLabel(last, toISODate(new Date()))}`
    : 'Not eaten yet';

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${recipe.name}?`,
      message: 'It leaves your recipes, but meals you already had stay in your history.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      setDeleteFailed(false);
      await deleteRecipe(recipe.id);
      router.back();
    } catch (error) {
      console.error('Could not delete recipe', error);
      setDeleteFailed(true);
    }
  };

  return (
    <StackContent>
      <View style={{ gap: 6 }}>
        <ThemedText type="title" accessibilityRole="header">
          {recipe.name}
        </ThemedText>
        {recipe.description ? (
          <ThemedText themeColor="textSecondary">{recipe.description}</ThemedText>
        ) : null}
        {meta ? (
          <ThemedText type="small" themeColor="textSecondary">
            {meta}
          </ThemedText>
        ) : null}
        <ThemedText type="small" themeColor="herb">
          {stats}
        </ThemedText>
      </View>

      {recipe.ingredients.length > 0 && (
        <View style={{ gap: 8 }}>
          <ThemedText type="heading" accessibilityRole="header">
            Ingredients
          </ThemedText>
          <Card style={{ padding: 16, gap: 8 }}>
            {recipe.ingredients.map((ingredient, i) => (
              // Ingredients have no ids, and the list only changes by being replaced.
              // biome-ignore lint/suspicious/noArrayIndexKey: see above
              <ThemedText key={i}>{ingredientLabel(ingredient)}</ThemedText>
            ))}
          </Card>
        </View>
      )}

      {recipe.steps.length > 0 && (
        <View style={{ gap: 8 }}>
          <ThemedText type="heading" accessibilityRole="header">
            Steps
          </ThemedText>
          <Card style={{ padding: 16, gap: 12 }}>
            {recipe.steps.map((step, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: same as ingredients
              <ThemedText key={i}>{`${i + 1}. ${step}`}</ThemedText>
            ))}
          </Card>
        </View>
      )}

      {deleteFailed ? (
        <ThemedText accessibilityRole="alert" type="small" style={{ color: theme.accent }}>
          Couldn't delete the recipe. Please try again.
        </ThemedText>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Delete" variant="secondary" onPress={remove} style={{ flex: 1 }} />
        <Button
          title="Edit"
          onPress={() => router.push({ pathname: '/recipe/[id]/edit', params: { id: recipe.id } })}
          style={{ flex: 1 }}
        />
      </View>
    </StackContent>
  );
}
