import {
  addTag,
  draftFromRecipe,
  emptyDraft,
  ingredientLabel,
  parseDraft,
  tagsOf,
} from '@/lib/recipes';
import type { Recipe } from '@/types/models';

const recipe: Recipe = {
  id: '1',
  name: 'Soup',
  description: 'Warm',
  ingredients: [{ name: 'flour', quantity: 200, unit: 'g' }, { name: 'salt' }],
  steps: ['Boil', 'Serve'],
  prepMinutes: 30,
  tags: ['Quick'],
  createdAt: '2026-11-05T00:00:00.000Z',
  updatedAt: '2026-11-05T00:00:00.000Z',
};

describe('parseDraft', () => {
  it('needs only a name, and leaves the rest empty', () => {
    expect(parseDraft({ ...emptyDraft, name: '  Sarmale ' }).fields).toEqual({
      name: 'Sarmale',
      description: undefined,
      prepMinutes: undefined,
      tags: [],
      ingredients: [],
      steps: [],
    });
  });

  it('rejects a blank name', () => {
    expect(parseDraft({ ...emptyDraft, name: '   ' }).errors?.name).toBeDefined();
  });

  it.each(['abc', '1.5', '-5', '0'])('rejects %s as a prep time', (prepMinutes) => {
    const result = parseDraft({ ...emptyDraft, name: 'Soup', prepMinutes });
    expect(result.errors?.prepMinutes).toBeDefined();
  });

  it('splits ingredients and steps by line and drops blank lines', () => {
    const { fields } = parseDraft({
      ...emptyDraft,
      name: 'Soup',
      ingredients: ' salt \n\npepper\n',
      steps: 'Boil\n\n',
    });
    expect(fields?.ingredients).toEqual([{ name: 'salt' }, { name: 'pepper' }]);
    expect(fields?.steps).toEqual(['Boil']);
  });
});

describe('draftFromRecipe', () => {
  it('keeps everything the user sees when parsed back', () => {
    const { fields } = parseDraft(draftFromRecipe(recipe));
    expect(fields).toMatchObject({ name: 'Soup', description: 'Warm', prepMinutes: 30 });
    expect(fields?.ingredients.map(ingredientLabel)).toEqual(['200 g flour', 'salt']);
    expect(fields?.steps).toEqual(['Boil', 'Serve']);
  });
});

describe('addTag', () => {
  it('trims new tags', () => {
    expect(addTag(['Quick'], ' Soup ')).toEqual(['Quick', 'Soup']);
  });

  it('ignores blanks and duplicates in any casing', () => {
    expect(addTag(['Quick'], '  ')).toEqual(['Quick']);
    expect(addTag(['Quick'], 'quick')).toEqual(['Quick']);
  });
});

describe('tagsOf', () => {
  it('lists each tag once', () => {
    expect(tagsOf([recipe, recipe])).toEqual(['Quick']);
  });
});
