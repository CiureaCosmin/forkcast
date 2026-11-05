import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { MealCard, MealRow } from '@/components/meal-card';
import { MealReview } from '@/components/meal-review';
import { PersonSwitcher } from '@/components/person-switcher';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { partnerOf, people } from '@/data/sample';
import { chooseMe, useMe, useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';
import { mealsFor, mealsToReview, mealTypeLabel } from '@/lib/meals';
import {
  addDays,
  agoLabel,
  lastEaten,
  longDateLabel,
  MEAL_ORDER,
  mealsOnDate,
  parseDate,
  shortDateLabel,
  toISODate,
  WEEKDAYS,
  WEEKDAYS_LONG,
} from '@/lib/stats';
import type { MealType } from '@/types/models';

function dayHeading(date: string, today: string) {
  if (date === today) return 'Today';
  if (date === addDays(today, 1)) return 'Tomorrow';
  if (date === addDays(today, -1)) return 'Yesterday';
  return shortDateLabel(date);
}

const openPicker = (date: string, mealType: MealType) =>
  router.push({ pathname: '/meal/new', params: { date, mealType } });

function DaySection({ date, today }: { date: string; today: string }) {
  const { recipes, meals, viewing } = useStore();
  const me = useMe();
  const readOnly = viewing !== me;
  const personMeals = mealsFor(meals, viewing);
  const dayMeals = mealsOnDate(personMeals, date);
  return (
    <View style={{ paddingTop: 22, gap: 10 }}>
      <ThemedText type="heading" accessibilityRole="header">
        {dayHeading(date, today)}
      </ThemedText>
      {MEAL_ORDER.map((slot) => {
        const slotMeals = dayMeals.filter((meal) => meal.mealType === slot);
        const label = mealTypeLabel(slot).toLowerCase();
        return (
          <View key={slot} style={{ gap: 10 }}>
            {slotMeals.map((meal) => {
              if (date !== today || readOnly) {
                return <MealRow key={meal.id} meal={meal} recipes={recipes} readOnly={readOnly} />;
              }
              const last = meal.recipeId ? lastEaten(meal.recipeId, personMeals) : undefined;
              return (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  recipes={recipes}
                  lastHad={last ? `last had ${agoLabel(last, today)}` : undefined}
                />
              );
            })}
            {!readOnly && slotMeals.length === 0 && (
              <Button
                variant="dashed"
                icon="add"
                title={`${date < today ? 'Log' : 'Plan'} ${label}`}
                accessibilityLabel={`${date < today ? 'Log' : 'Plan'} ${label}, ${dayHeading(date, today)}`}
                onPress={() => openPicker(date, slot)}
              />
            )}
            {!readOnly && slotMeals.length > 0 && (
              <View style={{ alignSelf: 'flex-start' }}>
                <Chip
                  label={`Add to ${label}`}
                  accessibilityLabel={`Add to ${label}, ${dayHeading(date, today)}`}
                  onPress={() => openPicker(date, slot)}
                />
              </View>
            )}
          </View>
        );
      })}
      {readOnly && dayMeals.length === 0 && (
        <ThemedText themeColor="textSecondary">Nothing planned.</ThemedText>
      )}
    </View>
  );
}

export default function PlanScreen() {
  const theme = useTheme();
  const { recipes, meals, viewing } = useStore();
  const me = useMe();
  const today = toISODate(new Date());
  const [picked, setPicked] = useState(today);
  // Yesterday, for anything still to log, then the days to plan.
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 1));
  // After midnight the picked day can drop off the strip.
  const selected = days.includes(picked) ? picked : today;
  const toReview = viewing === me ? mealsToReview(mealsFor(meals, me), today) : [];
  const other = people.find((person) => person.id === partnerOf(me));
  const current = people.find((person) => person.id === me);

  return (
    <Screen eyebrow={longDateLabel(today)} title="What's cooking">
      <PersonSwitcher />
      {toReview.length > 0 && <MealReview meals={toReview} recipes={recipes} />}
      <View style={{ flexDirection: 'row', gap: 4, paddingTop: 16 }}>
        {days.map((date) => {
          const isSelected = date === selected;
          const day = parseDate(date);
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityLabel={`${WEEKDAYS_LONG[day.getDay()]} ${day.getDate()}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => setPicked(date)}
              style={({ pressed }) => ({
                flex: 1,
                height: 60,
                borderRadius: 14,
                borderCurve: 'continuous',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                backgroundColor: isSelected ? theme.text : theme.surface,
                borderWidth: 1.5,
                borderColor: date === today && !isSelected ? theme.accent : 'transparent',
                opacity: pressed ? 0.7 : 1,
              })}>
              <ThemedText
                type="caption"
                themeColor={isSelected ? 'background' : 'textSecondary'}
                style={{ fontSize: 11, fontFamily: Fonts.bodySemiBold }}>
                {WEEKDAYS[day.getDay()]}
              </ThemedText>
              <ThemedText
                type="bodyStrong"
                themeColor={isSelected ? 'background' : 'text'}
                style={{ fontFamily: isSelected ? Fonts.bodySemiBold : Fonts.bodyMedium }}>
                {day.getDate()}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <DaySection date={selected} today={today} />
      <DaySection date={addDays(selected, 1)} today={today} />
      {other && current && (
        <View style={{ paddingTop: 28, alignItems: 'center' }}>
          <Chip
            label={`Not ${current.name}? Switch to ${other.name}`}
            onPress={() => chooseMe(other.id)}
          />
        </View>
      )}
    </Screen>
  );
}
