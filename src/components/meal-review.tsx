import { View } from 'react-native';

import { setMealStatus } from '@/data/store';
import { mealName, mealTypeLabel } from '@/lib/meals';
import { shortDateLabel } from '@/lib/stats';
import type { Meal, Recipe } from '@/types/models';
import { Button } from './button';
import { Card } from './card';
import { ThemedText } from './themed-text';

/** Past planned meals waiting for an answer. They stay out of history until they get one. */
export function MealReview({ meals, recipes }: { meals: Meal[]; recipes: Recipe[] }) {
  return (
    <Card style={{ marginTop: 16, padding: 16, gap: 14 }}>
      <ThemedText type="subheading" accessibilityRole="header">
        Did you eat these?
      </ThemedText>
      {meals.map((meal) => (
        <View key={meal.id} style={{ gap: 8 }}>
          <View style={{ gap: 1 }}>
            <ThemedText type="bodyStrong">{mealName(meal, recipes)}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {`${shortDateLabel(meal.date)} · ${mealTypeLabel(meal.mealType)}`}
            </ThemedText>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title="Yes"
              icon="check"
              accessibilityLabel={`Yes, I ate ${mealName(meal, recipes)}`}
              onPress={() => setMealStatus(meal.id, 'eaten')}
              style={{ flex: 1 }}
            />
            <Button
              title="No"
              variant="secondary"
              accessibilityLabel={`No, I skipped ${mealName(meal, recipes)}`}
              onPress={() => setMealStatus(meal.id, 'skipped')}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ))}
    </Card>
  );
}
