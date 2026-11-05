import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { RecipeThumb } from '@/components/recipe-thumb';
import { SearchField } from '@/components/search-field';
import { StackContent } from '@/components/stack-content';
import { ThemedText } from '@/components/themed-text';
import { addMeal, useStore } from '@/data/store';
import { mealTypeLabel, QUICK_MEALS, quickMealLabel, statusFor } from '@/lib/meals';
import { activeRecipes } from '@/lib/recipes';
import { MEAL_ORDER, shortDateLabel, toISODate } from '@/lib/stats';
import type { MealType } from '@/types/models';

function isMealType(value: string | undefined): value is MealType {
  return MEAL_ORDER.includes(value as MealType);
}

export default function NewMealScreen() {
  const { date, mealType } = useLocalSearchParams<{ date: string; mealType: string }>();
  const recipes = activeRecipes(useStore().recipes);
  const [query, setQuery] = useState('');
  const [eatenToday, setEatenToday] = useState(false);
  const today = toISODate(new Date());

  if (!isMealType(mealType) || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) {
    return (
      <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', paddingTop: 48 }}>
        This link doesn't point to a meal.
      </ThemedText>
    );
  }

  const status = statusFor(date, today, eatenToday);
  const slot = { date, mealType, status };
  const needle = query.trim().toLowerCase();
  const matches = recipes.filter((recipe) => recipe.name.toLowerCase().includes(needle));

  const pick = (meal: Parameters<typeof addMeal>[0]) => {
    addMeal(meal);
    router.back();
  };

  return (
    <StackContent>
      <ThemedText type="heading" accessibilityRole="header">
        {`${mealTypeLabel(mealType)} · ${shortDateLabel(date)}`}
      </ThemedText>
      {date === today && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Planned" selected={!eatenToday} onPress={() => setEatenToday(false)} />
          <Chip label="Already eaten" selected={eatenToday} onPress={() => setEatenToday(true)} />
        </View>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {QUICK_MEALS.map((quickType) => (
          <Chip
            key={quickType}
            label={quickMealLabel(quickType)}
            onPress={() => pick({ ...slot, quickType })}
          />
        ))}
      </View>
      <SearchField
        label="Search recipes"
        placeholder="Search recipes"
        value={query}
        onChangeText={setQuery}
      />
      <View style={{ gap: 10 }}>
        {matches.map((recipe) => (
          <Pressable
            key={recipe.id}
            accessibilityRole="button"
            accessibilityLabel={recipe.name}
            onPress={() => pick({ ...slot, recipeId: recipe.id })}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12 }}>
              <RecipeThumb name={recipe.name} />
              <ThemedText type="bodyStrong" style={{ flex: 1 }}>
                {recipe.name}
              </ThemedText>
            </Card>
          </Pressable>
        ))}
        {matches.length === 0 && (
          <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', paddingTop: 16 }}>
            No recipes match. Add new ones in the Recipes tab.
          </ThemedText>
        )}
      </View>
    </StackContent>
  );
}
