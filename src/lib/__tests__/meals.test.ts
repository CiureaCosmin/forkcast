import { hasSameMeal, mealName, mealsToReview, statusFor } from '@/lib/meals';
import type { Meal } from '@/types/models';

const meal = (changes: Partial<Meal> = {}): Meal =>
  ({
    id: 'a',
    personId: 'person-1',
    recipeId: 'soup',
    date: '2026-11-04',
    mealType: 'lunch',
    status: 'planned',
    isLeftovers: false,
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...changes,
  }) as Meal;

describe('mealsToReview', () => {
  it('finds past planned meals, oldest first', () => {
    const meals = [
      meal({ id: 'recent', date: '2026-11-04' }),
      meal({ id: 'old', date: '2026-11-02' }),
      meal({ id: 'today', date: '2026-11-05' }),
      meal({ id: 'answered', date: '2026-11-03', status: 'eaten' }),
    ];
    expect(mealsToReview(meals, '2026-11-05').map(({ id }) => id)).toEqual(['old', 'recent']);
  });
});

describe('hasSameMeal', () => {
  it('matches only the same person, slot and dish', () => {
    const meals = [meal()];
    expect(hasSameMeal(meals, meal({ id: 'b' }))).toBe(true);
    expect(hasSameMeal(meals, meal({ personId: 'person-2' }))).toBe(false);
    expect(hasSameMeal(meals, meal({ mealType: 'dinner' }))).toBe(false);
    expect(hasSameMeal(meals, meal({ recipeId: 'salad' }))).toBe(false);
  });
});

describe('statusFor', () => {
  it('marks past meals eaten and future meals planned, whatever was chosen', () => {
    expect(statusFor('2026-11-04', '2026-11-05', false)).toBe('eaten');
    expect(statusFor('2026-11-06', '2026-11-05', true)).toBe('planned');
  });

  it('lets today be either', () => {
    expect(statusFor('2026-11-05', '2026-11-05', true)).toBe('eaten');
    expect(statusFor('2026-11-05', '2026-11-05', false)).toBe('planned');
  });
});

describe('mealName', () => {
  it('names quick meals without a recipe', () => {
    expect(mealName(meal({ recipeId: undefined, quickType: 'takeout' }), [])).toBe('Takeout');
  });
});
