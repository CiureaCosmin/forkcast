import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { RecipeForm } from '@/components/recipe-form';
import { emptyDraft } from '@/lib/recipes';

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useNavigation: () => ({ dispatch: jest.fn() }),
}));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const renderForm = (onSave: jest.Mock) =>
  render(<RecipeForm initial={emptyDraft} knownTags={['Soup']} onSave={onSave} />);

beforeEach(() => jest.clearAllMocks());

it('asks for a name and does not save without one', async () => {
  const onSave = jest.fn();
  await renderForm(onSave);
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByText('Give the recipe a name.')).toBeOnTheScreen();
  expect(onSave).not.toHaveBeenCalled();
});

it('saves the details, including a tag still in the field, then leaves', async () => {
  const onSave = jest.fn().mockResolvedValue(undefined);
  await renderForm(onSave);
  await fireEvent.changeText(screen.getByLabelText('Name'), 'Ciorbă');
  await fireEvent.press(screen.getByRole('button', { name: 'Soup' }));
  await fireEvent.changeText(screen.getByLabelText('Tags (optional)'), 'Winter');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Ciorbă', tags: ['Soup', 'Winter'] }),
  );
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('stays on the form and shows an error when saving fails', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const onSave = jest.fn().mockRejectedValue(new Error('full'));
  await renderForm(onSave);
  await fireEvent.changeText(screen.getByLabelText('Name'), 'Ciorbă');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('alert')).toHaveTextContent(
    "Couldn't save the recipe. Please try again.",
  );
  expect(router.back).not.toHaveBeenCalled();
});
