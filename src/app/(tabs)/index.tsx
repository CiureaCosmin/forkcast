import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { RecipeRow } from '@/components/recipe-row';
import { Screen } from '@/components/screen';
import { SearchField } from '@/components/search-field';
import { ThemedText } from '@/components/themed-text';
import { useMe, useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';
import { mealsFor } from '@/lib/meals';
import { activeRecipes, tagsOf } from '@/lib/recipes';
import { agoLabel, lastEaten, timesEaten, toISODate } from '@/lib/stats';

export default function RecipesScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const today = toISODate(new Date());
  const store = useStore();
  const saved = activeRecipes(store.recipes);
  const myMeals = mealsFor(store.meals, useMe());
  const allTags = tagsOf(saved);
  // Editing or deleting recipes can remove the selected tag altogether.
  const tag = selectedTag && allTags.includes(selectedTag) ? selectedTag : null;

  const needle = query.trim().toLowerCase();
  const recipes = saved.filter(
    (recipe) =>
      (!tag || recipe.tags.includes(tag)) &&
      (!needle ||
        recipe.name.toLowerCase().includes(needle) ||
        recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(needle))),
  );

  return (
    <Screen
      title="Recipes"
      subtitle={`${saved.length} saved by your household`}
      headerRight={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add recipe"
          onPress={() => router.push('/recipe/new')}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: theme.accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}>
          <Icon name="add" size={22} color={theme.onAccent} />
        </Pressable>
      }>
      <View style={{ paddingTop: 18, gap: 12 }}>
        <SearchField
          label="Search recipes"
          placeholder="Search recipes or ingredients"
          value={query}
          onChangeText={setQuery}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}>
          <Chip label="All" selected={tag === null} onPress={() => setSelectedTag(null)} />
          {allTags.map((name) => (
            <Chip
              key={name}
              label={name}
              selected={tag === name}
              onPress={() => setSelectedTag(name)}
            />
          ))}
        </ScrollView>
      </View>
      <View style={{ paddingTop: 16, gap: 10 }}>
        {recipes.map((recipe) => {
          const last = lastEaten(recipe.id, myMeals);
          const count = timesEaten(recipe.id, myMeals);
          const stats = last ? `Eaten ${count}× · last ${agoLabel(last, today)}` : 'Not eaten yet';
          return <RecipeRow key={recipe.id} recipe={recipe} stats={stats} />;
        })}
        {recipes.length === 0 && (
          <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', paddingTop: 24 }}>
            {saved.length === 0
              ? 'No recipes yet. Add your first one.'
              : 'No recipes match your search.'}
          </ThemedText>
        )}
      </View>
    </Screen>
  );
}
