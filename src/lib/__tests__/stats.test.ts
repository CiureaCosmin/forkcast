import { initials, lastEaten, timesEaten } from '@/lib/stats';
import type { Meal } from '@/types/models';

const meal = (date: string, changes: Partial<Meal> = {}): Meal =>
  ({
    id: date,
    personId: 'person-1',
    recipeId: 'soup',
    date,
    mealType: 'lunch',
    status: 'eaten',
    isLeftovers: false,
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...changes,
  }) as Meal;

describe('leftovers', () => {
  const meals = [meal('2026-11-01'), meal('2026-11-02', { isLeftovers: true })];

  it('do not count as another time eaten', () => {
    expect(timesEaten('soup', meals)).toBe(1);
  });

  it('still update the last eaten date', () => {
    expect(lastEaten('soup', meals)).toBe('2026-11-02');
  });
});

describe('timesEaten', () => {
  it('ignores planned and skipped meals', () => {
    const meals = [
      meal('2026-11-01', { status: 'planned' }),
      meal('2026-11-02', { status: 'skipped' }),
    ];
    expect(timesEaten('soup', meals)).toBe(0);
  });
});

describe('initials', () => {
  it('uses the first two long words', () => {
    expect(initials('Mushroom risotto')).toBe('MR');
  });

  it('falls back to the name when every word is short', () => {
    expect(initials('Ou')).toBe('OU');
  });
});
