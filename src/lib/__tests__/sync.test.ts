import {
  addToOutbox,
  mealToRow,
  mergeRemote,
  nextCursor,
  type OutboxEntry,
  pendingIds,
  prepareImport,
  recipeToRow,
  removeSent,
  rowToMeal,
  rowToRecipe,
} from '@/lib/sync';
import type { Meal, Recipe } from '@/types/models';

const recipe = (id: string, updatedAt = '2026-11-07T10:00:00.000Z'): Recipe => ({
  id,
  name: `Recipe ${id}`,
  ingredients: [{ name: 'Eggs' }],
  steps: ['Cook'],
  tags: ['Quick'],
  prepMinutes: 15,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt,
});

const meal = (id: string, personId: string, recipeId = 'r1'): Meal => ({
  id,
  personId,
  recipeId,
  date: '2026-11-07',
  mealType: 'dinner',
  status: 'planned',
  isLeftovers: false,
  updatedAt: '2026-11-07T10:00:00.000Z',
});

const UUID_A = '6f1c1c3e-1f0a-4a55-9d7e-2b1f4c6d8e01';
const USER = '0f000000-0000-4000-8000-000000000001';

describe('outbox', () => {
  it('keeps only the latest change per row', () => {
    const first: OutboxEntry = { table: 'recipes', record: recipe('a') };
    const second: OutboxEntry = { table: 'recipes', record: recipe('a', '2026-11-07T11:00:00Z') };
    const other: OutboxEntry = { table: 'meals', record: meal('a', USER) };
    const outbox = addToOutbox(addToOutbox(addToOutbox([], first), other), second);
    expect(outbox).toEqual([other, second]);
    expect(pendingIds(outbox, 'recipes')).toEqual(new Set(['a']));
  });

  it('removes sent entries, but keeps a row that changed again meanwhile', () => {
    const sent: OutboxEntry = { table: 'recipes', record: recipe('a') };
    const sentB: OutboxEntry = { table: 'recipes', record: recipe('b') };
    const changedAgain: OutboxEntry = {
      table: 'recipes',
      record: recipe('a', '2026-11-07T12:00:00Z'),
    };
    expect(removeSent([changedAgain, sentB], [sent, sentB])).toEqual([changedAgain]);
  });

  it('a deletion after the send stays queued', () => {
    const sent: OutboxEntry = { table: 'meals', record: meal('m', USER) };
    const deleted: OutboxEntry = { ...sent, deletedAt: '2026-11-07T10:00:00.000Z' };
    expect(removeSent([deleted], [sent])).toEqual([deleted]);
  });
});

describe('rows', () => {
  it('round-trips a recipe', () => {
    const row = recipeToRow(recipe('a'), 'h1');
    expect(row).toMatchObject({ household_id: 'h1', prep_minutes: 15, deleted_at: null });
    const back = rowToRecipe({
      ...row,
      description: null,
      photo_url: null,
      archived_at: null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      ingredients: row.ingredients ?? [],
      steps: row.steps ?? [],
      prep_minutes: row.prep_minutes ?? null,
      tags: row.tags ?? [],
      deleted_at: null,
      server_updated_at: '2026-11-07T10:00:01Z',
    });
    expect(back).toEqual(recipe('a'));
  });

  it('marks a deletion', () => {
    expect(recipeToRow(recipe('a'), 'h1', '2026-11-07T12:00:00Z').deleted_at).toBe(
      '2026-11-07T12:00:00Z',
    );
  });

  it('round-trips recipe meals and quick meals', () => {
    const quick: Meal = { ...meal('q', USER), recipeId: undefined, quickType: 'takeout' };
    for (const original of [meal('m', USER), quick]) {
      const row = mealToRow(original, 'h1');
      const back = rowToMeal({
        ...row,
        recipe_id: row.recipe_id ?? null,
        quick_type: row.quick_type ?? null,
        notes: null,
        status: row.status ?? 'planned',
        is_leftovers: row.is_leftovers ?? false,
        updated_at: row.updated_at as string,
        deleted_at: null,
        server_updated_at: '2026-11-07T10:00:01Z',
      });
      expect(back).toEqual(
        original.quickType
          ? { ...original, recipeId: undefined, notes: undefined }
          : { ...original, notes: undefined },
      );
    }
  });
});

describe('mergeRemote', () => {
  it('adds, replaces and removes rows, except those with changes waiting', () => {
    const local = [recipe('keep'), recipe('edit'), recipe('gone'), recipe('mine')];
    const merged = mergeRemote(
      local,
      [
        { record: { ...recipe('edit'), name: 'Edited elsewhere' }, deleted: false },
        { record: recipe('gone'), deleted: true },
        { record: recipe('new'), deleted: false },
        { record: { ...recipe('mine'), name: 'Older server copy' }, deleted: false },
      ],
      new Set(['mine']),
    );
    expect(merged.map((r) => [r.id, r.name])).toEqual([
      ['keep', 'Recipe keep'],
      ['edit', 'Edited elsewhere'],
      ['mine', 'Recipe mine'],
      ['new', 'Recipe new'],
    ]);
  });
});

describe('nextCursor', () => {
  it('moves to the latest server time, minus a margin', () => {
    expect(
      nextCursor(undefined, [
        { server_updated_at: '2026-11-07T10:00:00.000Z' },
        { server_updated_at: '2026-11-07T10:00:30.000Z' },
      ]),
    ).toBe('2026-11-07T10:00:25.000Z');
  });

  it('stays put when nothing came back', () => {
    expect(nextCursor('2026-11-07T10:00:00.000Z', [])).toBe('2026-11-07T10:00:00.000Z');
  });
});

describe('prepareImport', () => {
  it("gives sample ids new UUIDs and moves the device person's meals to the user", () => {
    let n = 0;
    const newId = () => `00000000-0000-4000-8000-00000000000${++n}`;
    const { recipes, meals } = prepareImport(
      [recipe('sarmale'), recipe(UUID_A)],
      [
        meal('person-1-planned', 'person-1', 'sarmale'),
        meal('partner-meal', 'person-2', 'sarmale'),
        { ...meal('quick', 'person-1'), recipeId: undefined, quickType: 'takeout' },
      ],
      'person-1',
      USER,
      newId,
    );
    const sarmale = recipes[0]?.id;
    expect(sarmale).toMatch(/^00000000-0000-4000-8000-/);
    expect(recipes[1]?.id).toBe(UUID_A);
    expect(meals).toHaveLength(2);
    expect(meals.every((m) => m.personId === USER)).toBe(true);
    expect(meals[0]).toMatchObject({ recipeId: sarmale });
    expect(meals[1]).toMatchObject({ quickType: 'takeout' });
    expect(meals.every((m) => m.id.startsWith('00000000-0000-4000-8000-'))).toBe(true);
  });
});
