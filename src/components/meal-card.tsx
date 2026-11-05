import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { setMealStatus } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';
import { mealName, mealTypeLabel } from '@/lib/meals';
import { durationLabel } from '@/lib/stats';
import type { Meal, Recipe } from '@/types/models';
import { Button } from './button';
import { Card } from './card';
import { RecipeThumb } from './recipe-thumb';
import { ThemedText } from './themed-text';

const statusLabels = { eaten: 'Eaten', skipped: 'Skipped' };

const openMeal = (meal: Meal) => router.push({ pathname: '/meal/[id]', params: { id: meal.id } });

/** Full card with "I ate it" and "Skip" actions for your meals today. */
export function MealCard({
  meal,
  recipes,
  lastHad,
}: {
  meal: Meal;
  recipes: Recipe[];
  lastHad?: string;
}) {
  const theme = useTheme();
  const name = mealName(meal, recipes);
  const prep = recipes.find((recipe) => recipe.id === meal.recipeId)?.prepMinutes;
  const details = [
    meal.isLeftovers ? 'Leftovers' : null,
    prep && !meal.isLeftovers ? durationLabel(prep) : null,
    lastHad,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card style={{ padding: 16, gap: 12, borderRadius: Radius.cardLarge }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${mealTypeLabel(meal.mealType)}: ${name}`}
        onPress={() => openMeal(meal)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          opacity: pressed ? 0.7 : 1,
        })}>
        <RecipeThumb name={name} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="label" themeColor="textSecondary">
            {mealTypeLabel(meal.mealType)}
          </ThemedText>
          <ThemedText type="subheading">{name}</ThemedText>
          {details ? (
            <ThemedText type="caption" themeColor="textSecondary">
              {details}
            </ThemedText>
          ) : null}
        </View>
      </Pressable>
      {meal.status === 'planned' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            title="I ate it"
            icon="check"
            onPress={() => setMealStatus(meal.id, 'eaten')}
            style={{ flex: 1 }}
          />
          <Button
            title="Skip"
            variant="secondary"
            onPress={() => setMealStatus(meal.id, 'skipped')}
            style={{ flex: 1 }}
          />
        </View>
      ) : (
        <ThemedText
          type="compact"
          style={{ color: meal.status === 'eaten' ? theme.herb : theme.textSecondary }}>
          {statusLabels[meal.status]}
        </ThemedText>
      )}
    </Card>
  );
}

/** Compact row for other days, and for your partner's plan, which is read-only. */
export function MealRow({
  meal,
  recipes,
  readOnly,
}: {
  meal: Meal;
  recipes: Recipe[];
  readOnly?: boolean;
}) {
  const name = mealName(meal, recipes);
  const prep = recipes.find((recipe) => recipe.id === meal.recipeId)?.prepMinutes;
  const detail =
    meal.status !== 'planned'
      ? statusLabels[meal.status]
      : meal.isLeftovers
        ? 'Leftovers'
        : prep
          ? durationLabel(prep)
          : null;
  return (
    <Pressable
      disabled={readOnly}
      accessibilityRole={readOnly ? undefined : 'button'}
      accessibilityLabel={`${mealTypeLabel(meal.mealType)}: ${name}`}
      onPress={() => openMeal(meal)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Card
        style={{
          borderRadius: 16,
          paddingVertical: 12,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="label" themeColor="textSecondary">
            {mealTypeLabel(meal.mealType)}
          </ThemedText>
          <ThemedText type="bodyStrong">{name}</ThemedText>
        </View>
        {detail ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {detail}
          </ThemedText>
        ) : null}
      </Card>
    </Pressable>
  );
}
