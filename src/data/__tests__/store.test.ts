import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { sampleRecipes } from '@/data/sample';
import {
  addMeal,
  chooseMe,
  copyToPartner,
  createRecipe,
  deleteRecipe,
  loadData,
  planLeftovers,
  removeMeal,
  setChangeHandler,
  setMealStatus,
  updateRecipe,
  useStore,
} from '@/data/store';
import type { RecipeFields } from '@/lib/recipes';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-crypto', () => {
  let count = 0;
  return { randomUUID: () => `id-${++count}` };
});

const STORAGE_KEY = 'forkcast:recipes:v1';
const fields: RecipeFields = { name: 'Ciulama', tags: [], ingredients: [], steps: [] };

async function store() {
  const { result } = await renderHook(() => useStore());
  return result;
}

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
  await act(() => loadData());
});

it('starts from the samples on first launch', async () => {
  expect((await store()).current).toMatchObject({ status: 'ready', recipes: sampleRecipes });
});

it('keeps a new recipe across restarts', async () => {
  await act(() => createRecipe(fields));
  await act(() => loadData());
  expect((await store()).current.recipes[0]).toMatchObject({ name: 'Ciulama' });
});

it('updates a recipe and clears removed fields', async () => {
  await act(() => updateRecipe('sarmale', { ...fields, prepMinutes: undefined }));
  await act(() => loadData());
  const saved = (await store()).current.recipes.find((recipe) => recipe.id === 'sarmale');
  expect(saved).toMatchObject({ name: 'Ciulama', createdAt: expect.any(String) });
  expect(saved?.prepMinutes).toBeUndefined();
});

it('archives a deleted recipe that has meals', async () => {
  await act(() => deleteRecipe('risotto'));
  const saved = (await store()).current.recipes.find((recipe) => recipe.id === 'risotto');
  expect(saved?.archivedAt).toEqual(expect.any(String));
});

it('removes a deleted recipe that has no meals', async () => {
  await act(() => createRecipe(fields));
  const id = (await store()).current.recipes[0]?.id ?? '';
  await act(() => deleteRecipe(id));
  expect((await store()).current.recipes).toEqual(sampleRecipes);
});

it('reports unreadable data and leaves it in place', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await AsyncStorage.setItem(STORAGE_KEY, 'not json');
  await act(() => loadData());
  expect((await store()).current).toMatchObject({ status: 'error', recipes: [] });
  expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe('not json');
});

it('keeps the list unchanged when saving fails', async () => {
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('full'));
  await expect(createRecipe(fields)).rejects.toThrow('full');
  expect((await store()).current.recipes).toEqual(sampleRecipes);
});

describe('meals', () => {
  const slot = { date: '2026-11-05', mealType: 'lunch', status: 'planned' } as const;
  const myMeals = async (id = 'person-1') =>
    (await store()).current.meals.filter(
      (meal) => meal.personId === id && meal.date >= '2026-11-05',
    );

  beforeEach(async () => {
    await AsyncStorage.setItem('forkcast:meals:v1', '[]');
    await act(() => loadData());
    await act(() => chooseMe('person-1'));
  });

  it('keeps meals and the chosen person across restarts', async () => {
    await act(() => addMeal({ ...slot, recipeId: 'risotto' }));
    await act(() => loadData());
    expect((await store()).current.me).toBe('person-1');
    expect(await myMeals()).toHaveLength(1);
  });

  it('keeps both changes when they are made at the same moment', async () => {
    await act(() =>
      Promise.all([
        addMeal({ ...slot, recipeId: 'risotto' }),
        addMeal({ ...slot, recipeId: 'sarmale' }),
      ]).then(() => {}),
    );
    await act(() => loadData());
    expect(await myMeals()).toHaveLength(2);
  });

  it('copies to the partner as planned, once', async () => {
    await act(() => addMeal({ ...slot, status: 'eaten', recipeId: 'risotto' }));
    const [meal] = await myMeals();
    if (!meal) throw new Error('no meal');
    await act(() => copyToPartner(meal));
    await act(() => copyToPartner(meal));
    const copies = await myMeals('person-2');
    expect(copies).toHaveLength(1);
    expect(copies[0]).toMatchObject({ status: 'planned', recipeId: 'risotto' });
    expect(copies[0]?.id).not.toBe(meal.id);
  });

  it('plans leftovers for the next day, marked as leftovers', async () => {
    await act(() => addMeal({ ...slot, mealType: 'dinner', recipeId: 'risotto' }));
    const [meal] = await myMeals();
    if (!meal) throw new Error('no meal');
    await act(() => planLeftovers(meal, 'lunch'));
    const copy = (await myMeals()).find((other) => other.id !== meal.id);
    expect(copy).toMatchObject({
      date: '2026-11-06',
      mealType: 'lunch',
      status: 'planned',
      isLeftovers: true,
    });
  });

  it('marks and removes a meal', async () => {
    await act(() => addMeal({ ...slot, recipeId: 'risotto' }));
    const [meal] = await myMeals();
    if (!meal) throw new Error('no meal');
    await act(() => setMealStatus(meal.id, 'eaten'));
    expect((await myMeals())[0]?.status).toBe('eaten');
    await act(() => removeMeal(meal.id));
    expect(await myMeals()).toHaveLength(0);
  });

  it('flags a failed save, keeps the list, and recovers', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('full'));
    await act(() => addMeal({ ...slot, recipeId: 'risotto' }));
    expect((await store()).current.saveFailed).toBe(true);
    expect(await myMeals()).toHaveLength(0);
    await act(() => addMeal({ ...slot, recipeId: 'risotto' }));
    expect((await store()).current.saveFailed).toBe(false);
  });

  it('archives a recipe when only the partner has a meal with it', async () => {
    await act(() => addMeal({ ...slot, recipeId: 'risotto' }));
    const [meal] = await myMeals();
    if (!meal) throw new Error('no meal');
    await act(() => copyToPartner(meal));
    await act(() => removeMeal(meal.id));
    await act(() => deleteRecipe('risotto'));
    const saved = (await store()).current.recipes.find((recipe) => recipe.id === 'risotto');
    expect(saved?.archivedAt).toEqual(expect.any(String));
  });
});

describe('changes for syncing', () => {
  const handler = jest.fn().mockResolvedValue(undefined);
  beforeEach(() => {
    handler.mockClear();
    setChangeHandler(handler);
  });
  afterEach(() => setChangeHandler(null));

  const handed = () => handler.mock.calls.flatMap(([entries]) => entries);

  it('hands over new and edited recipes', async () => {
    await act(() => createRecipe(fields));
    await act(() => updateRecipe('sarmale', { ...fields, name: 'Sarmale cu mămăligă' }));
    expect(handed()).toEqual([
      { table: 'recipes', record: expect.objectContaining({ name: 'Ciulama' }) },
      {
        table: 'recipes',
        record: expect.objectContaining({ id: 'sarmale', name: 'Sarmale cu mămăligă' }),
      },
    ]);
  });

  it('hands over a removed recipe as a deletion, and an archived one as an edit', async () => {
    await act(() => createRecipe(fields));
    const created = handed()[0]?.record;
    handler.mockClear();
    await act(() => deleteRecipe(created.id));
    await act(() => deleteRecipe('sarmale'));
    expect(handed()).toEqual([
      {
        table: 'recipes',
        record: expect.objectContaining({ id: created.id }),
        deletedAt: expect.any(String),
      },
      {
        table: 'recipes',
        record: expect.objectContaining({ id: 'sarmale', archivedAt: expect.any(String) }),
      },
    ]);
  });

  it('hands over meal changes, but not a save that failed', async () => {
    await act(() => chooseMe('person-1'));
    await act(() =>
      addMeal({ date: '2026-11-07', mealType: 'lunch', status: 'planned', recipeId: 'risotto' }),
    );
    expect(handed()).toEqual([
      { table: 'meals', record: expect.objectContaining({ recipeId: 'risotto' }) },
    ]);
    handler.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('full'));
    await act(() =>
      addMeal({ date: '2026-11-07', mealType: 'dinner', status: 'planned', recipeId: 'risotto' }),
    );
    expect(handler).not.toHaveBeenCalled();
  });
});
