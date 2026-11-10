import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { StackContent } from '@/components/stack-content';
import { ThemedText } from '@/components/themed-text';
import {
  copyToPartner,
  planLeftovers,
  removeMeal,
  setMealStatus,
  useMe,
  useStore,
} from '@/data/store';
import { confirm } from '@/lib/confirm';
import { hasSameMeal, mealName, mealTypeLabel, partnerOf } from '@/lib/meals';
import { addDays, MEAL_ORDER, shortDateLabel, toISODate } from '@/lib/stats';

const statusLabels = { planned: 'Planned', eaten: 'Eaten', skipped: 'Skipped' };

export default function MealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipes, meals, people } = useStore();
  const me = useMe();
  const meal = meals.find((other) => other.id === id);
  if (!meal || meal.personId !== me) {
    return (
      <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', paddingTop: 48 }}>
        This meal no longer exists.
      </ThemedText>
    );
  }

  const today = toISODate(new Date());
  const name = mealName(meal, recipes);
  const partner = partnerOf(people, me);
  // Until the partner has joined the household there's nobody to copy to.
  const canCopy = !!partner && !hasSameMeal(meals, { ...meal, personId: partner.id });
  const nextDay = addDays(meal.date, 1);
  const leftoverSlots = meal.recipeId
    ? MEAL_ORDER.filter((mealType) => !hasSameMeal(meals, { ...meal, date: nextDay, mealType }))
    : [];
  const status = (next: 'planned' | 'eaten' | 'skipped') => {
    setMealStatus(meal.id, next);
    router.back();
  };
  const remove = async () => {
    const ok = await confirm({
      title: `Remove ${name}?`,
      message: 'It leaves this plan and your history.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    removeMeal(meal.id);
    router.back();
  };

  return (
    <StackContent>
      <View style={{ gap: 6 }}>
        <ThemedText type="title" accessibilityRole="header">
          {name}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {`${shortDateLabel(meal.date)} · ${mealTypeLabel(meal.mealType)}`}
        </ThemedText>
        <ThemedText type="small" themeColor="herb">
          {[statusLabels[meal.status], meal.isLeftovers ? 'Leftovers' : null]
            .filter(Boolean)
            .join(' · ')}
        </ThemedText>
      </View>

      {meal.status === 'planned' ? (
        meal.date <= today && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title="I ate it"
              icon="check"
              onPress={() => status('eaten')}
              style={{ flex: 1 }}
            />
            <Button
              title="Skip"
              variant="secondary"
              onPress={() => status('skipped')}
              style={{ flex: 1 }}
            />
          </View>
        )
      ) : (
        <Button title="Back to planned" variant="secondary" onPress={() => status('planned')} />
      )}

      {canCopy && (
        <Button
          title={`Copy to ${partner.name}`}
          variant="secondary"
          onPress={() => {
            copyToPartner(meal);
            router.back();
          }}
        />
      )}

      {leftoverSlots.length > 0 && (
        <View style={{ gap: 8 }}>
          <ThemedText type="small">{`Leftovers on ${shortDateLabel(nextDay)}`}</ThemedText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {leftoverSlots.map((mealType) => (
              <Chip
                key={mealType}
                label={mealTypeLabel(mealType)}
                onPress={() => {
                  planLeftovers(meal, mealType);
                  router.back();
                }}
              />
            ))}
          </View>
        </View>
      )}

      <Button title="Remove" variant="secondary" onPress={remove} />
    </StackContent>
  );
}
