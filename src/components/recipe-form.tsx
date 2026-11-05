import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import {
  addTag,
  parseDraft,
  type RecipeDraft,
  type RecipeDraftErrors,
  type RecipeFields,
} from '@/lib/recipes';
import { Button } from './button';
import { Chip } from './chip';
import { StackContent } from './stack-content';
import { TextField } from './text-field';
import { ThemedText } from './themed-text';

export function RecipeForm({
  initial,
  knownTags,
  onSave,
}: {
  initial: RecipeDraft;
  knownTags: string[];
  onSave: (fields: RecipeFields) => Promise<void>;
}) {
  const theme = useTheme();
  const navigation = useNavigation();
  const [draft, setDraft] = useState(initial);
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<RecipeDraftErrors>({});
  const [saveFailed, setSaveFailed] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (changes: Partial<RecipeDraft>) => {
    setDraft({ ...draft, ...changes });
    setErrors({});
  };
  const toggleTag = (tag: string) =>
    update({
      tags: draft.tags.includes(tag)
        ? draft.tags.filter((other) => other !== tag)
        : [...draft.tags, tag],
    });
  const commitNewTag = () => {
    update({ tags: addTag(draft.tags, newTag) });
    setNewTag('');
  };

  const dirty = newTag.trim() !== '' || JSON.stringify(draft) !== JSON.stringify(initial);
  usePreventRemove(dirty && !saved, async ({ data }) => {
    const discard = await confirm({
      title: 'Discard changes?',
      message: "Your changes to this recipe won't be saved.",
      confirmLabel: 'Discard',
    });
    if (discard) navigation.dispatch(data.action);
  });

  // Leaves only after `saved` has rendered, or the unsaved-changes guard would still be active.
  useEffect(() => {
    if (saved) router.back();
  }, [saved]);

  const submit = async () => {
    const result = parseDraft({ ...draft, tags: addTag(draft.tags, newTag) });
    setErrors(result.errors ?? {});
    if (!result.fields) return;
    try {
      setSaveFailed(false);
      await onSave(result.fields);
      setSaved(true);
    } catch (error) {
      console.error('Could not save recipe', error);
      setSaveFailed(true);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <StackContent>
        <TextField
          label="Name"
          value={draft.name}
          onChangeText={(name) => update({ name })}
          error={errors.name}
          returnKeyType="next"
        />
        <TextField
          label="Description (optional)"
          value={draft.description}
          onChangeText={(description) => update({ description })}
        />
        <TextField
          label="Prep time in minutes (optional)"
          value={draft.prepMinutes}
          onChangeText={(prepMinutes) => update({ prepMinutes })}
          error={errors.prepMinutes}
          keyboardType="number-pad"
        />
        <View style={{ gap: 10 }}>
          <TextField
            label="Tags (optional)"
            value={newTag}
            onChangeText={setNewTag}
            onSubmitEditing={commitNewTag}
            placeholder="Add a tag"
            returnKeyType="done"
            submitBehavior="submit"
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[...new Set([...knownTags, ...draft.tags])].map((tag) => (
              <Chip
                key={tag}
                label={tag}
                selected={draft.tags.includes(tag)}
                onPress={() => toggleTag(tag)}
              />
            ))}
          </View>
        </View>
        <TextField
          label="Ingredients (optional)"
          hint="One per line"
          value={draft.ingredients}
          onChangeText={(ingredients) => update({ ingredients })}
          multiline
        />
        <TextField
          label="Steps (optional)"
          hint="One per line"
          value={draft.steps}
          onChangeText={(steps) => update({ steps })}
          multiline
        />
        {saveFailed ? (
          <ThemedText accessibilityRole="alert" type="small" style={{ color: theme.accent }}>
            Couldn't save the recipe. Please try again.
          </ThemedText>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => router.back()}
            style={{ flex: 1 }}
          />
          <Button title="Save" icon="check" onPress={submit} style={{ flex: 1 }} />
        </View>
      </StackContent>
    </KeyboardAvoidingView>
  );
}
