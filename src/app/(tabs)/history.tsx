import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { PersonSwitcher } from '@/components/person-switcher';
import { Screen } from '@/components/screen';
import { StatCard } from '@/components/stat-card';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';
import { mealName, mealsFor, mealTypeLabel } from '@/lib/meals';
import { activeRecipes } from '@/lib/recipes';
import {
  addDays,
  agoLabel,
  haventHadInAWhile,
  historyByDay,
  last30DaysCounts,
  mostEaten,
  shortDateLabel,
  toISODate,
} from '@/lib/stats';
import type { Meal } from '@/types/models';

const DAYS_PER_PAGE = 7;

function LogRow({ meal, last }: { meal: Meal; last: boolean }) {
  const theme = useTheme();
  const { recipes } = useStore();
  const name = mealName(meal, recipes);
  const eaten = meal.status === 'eaten';
  const detail = `${mealTypeLabel(meal.mealType)} · ${meal.isLeftovers ? 'leftovers · ' : ''}${meal.status}${meal.notes ? ` — ${meal.notes}` : ''}`;
  return (
    <View
      accessible
      accessibilityLabel={`${name}, ${detail}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.divider,
      }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: eaten ? theme.herb : 'transparent',
          borderWidth: eaten ? 0 : 1.5,
          borderColor: theme.dashed,
        }}>
        <Icon
          name={eaten ? 'check' : 'close'}
          size={eaten ? 16 : 14}
          color={eaten ? theme.onAccent : theme.textSecondary}
        />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <ThemedText type="compact" themeColor={eaten ? 'text' : 'textSecondary'}>
          {name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const theme = useTheme();
  const today = toISODate(new Date());
  const { recipes, meals, viewing } = useStore();
  const [dayCount, setDayCount] = useState(DAYS_PER_PAGE);
  const personMeals = mealsFor(meals, viewing);
  const counts = last30DaysCounts(personMeals, today);
  const top = mostEaten(recipes, personMeals);
  // A deleted recipe shouldn't be suggested again.
  const stale = haventHadInAWhile(activeRecipes(recipes), personMeals);
  const days = historyByDay(personMeals, today);

  return (
    <Screen title="History">
      <PersonSwitcher />
      <View style={{ flexDirection: 'row', gap: 10, paddingTop: 16 }}>
        <StatCard
          label="Last 30 days"
          value={String(counts.eaten)}
          detail={`meals eaten · ${counts.skipped} skipped`}
        />
        <StatCard
          label="Most eaten"
          value={top ? `${top.count}×` : '–'}
          detail={top?.recipe.name ?? 'Nothing eaten yet'}
        />
      </View>

      {stale && (
        <View
          style={{
            marginTop: 10,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 18,
            borderCurve: 'continuous',
            backgroundColor: theme.herbSoft,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText type="caption" themeColor="herb" style={{ fontFamily: Fonts.bodySemiBold }}>
              Haven't had in a while
            </ThemedText>
            <ThemedText type="bodyStrong">
              {`${stale.recipe.name} · ${agoLabel(stale.lastDate, today)}`}
            </ThemedText>
          </View>
        </View>
      )}

      {days.length === 0 && (
        <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', paddingTop: 32 }}>
          Nothing logged yet.
        </ThemedText>
      )}

      {days.slice(0, dayCount).map((day) => (
        <View key={day.date} style={{ paddingTop: 22, gap: 8 }}>
          <ThemedText type="label" themeColor="textSecondary" accessibilityRole="header">
            {day.date === today
              ? `Today · ${shortDateLabel(day.date)}`
              : day.date === addDays(today, -1)
                ? `Yesterday · ${shortDateLabel(day.date)}`
                : shortDateLabel(day.date)}
          </ThemedText>
          <Card>
            {day.meals.map((meal, i) => (
              <LogRow key={meal.id} meal={meal} last={i === day.meals.length - 1} />
            ))}
          </Card>
        </View>
      ))}

      {days.length > dayCount && (
        <Button
          title="Show more"
          variant="secondary"
          onPress={() => setDayCount(dayCount + DAYS_PER_PAGE)}
          style={{ marginTop: 22 }}
        />
      )}
    </Screen>
  );
}
