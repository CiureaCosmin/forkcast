import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { durationLabel } from '@/lib/stats';
import type { Recipe } from '@/types/models';
import { Card } from './card';
import { RecipeThumb } from './recipe-thumb';
import { ThemedText } from './themed-text';

export function RecipeRow({ recipe, stats }: { recipe: Recipe; stats: string }) {
  const meta = [recipe.prepMinutes ? durationLabel(recipe.prepMinutes) : null, ...recipe.tags]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12 }}>
        <RecipeThumb name={recipe.name} />
        <View style={{ flex: 1, gap: 3 }}>
          <ThemedText type="bodyStrong" numberOfLines={1}>
            {recipe.name}
          </ThemedText>
          {meta ? (
            <ThemedText type="caption" themeColor="textSecondary">
              {meta}
            </ThemedText>
          ) : null}
          <ThemedText
            type="label"
            themeColor="herb"
            style={{ textTransform: 'none', letterSpacing: 0, marginTop: 2 }}>
            {stats}
          </ThemedText>
        </View>
      </Card>
    </Pressable>
  );
}
