import { useSelector } from '@xstate/react';
import { useSelector as useStoreSelector } from '@xstate/store-react';
import { PressableScale } from 'pressto';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CHECK_IN_EVENTS,
  CHECK_IN_STATES,
  NAVIGATION_STATES,
  REFLECTION_KEYBOARD_BOTTOM_OFFSET,
} from '@/constants';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import {
  emotionName,
  emotionNuance,
  optionalNoteAccessibilityLabel,
  optionalNotePlaceholder,
} from './emotion-copy';
import { checkInHistoryStore } from '../application/check-in-history.store';
import {
  recommendedBeliefSystemIds,
  type BeliefSystemId,
} from '../domain/belief-system';
import {
  beliefSystemText,
  noBeliefSystemText,
} from './belief-system-copy';
import {
  confirmCheckInDeletion,
  deleteMomentAccessibilityLabel,
  deleteMomentText,
} from './check-in-deletion';
import { palette, type } from './theme';

const _selectSnapshot = (
  snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>,
) => snapshot;
const _selectHistory = (
  state: ReturnType<typeof checkInHistoryStore.getSnapshot>,
) => state.context.entries;

function BeliefSystemOption({
  disabled,
  id,
  selected,
}: {
  disabled: boolean;
  id: BeliefSystemId | null;
  selected: boolean;
}) {
  const actor = useAppNavigationActor();
  const _select = () => actor.send({
    type: CHECK_IN_EVENTS.BELIEF_SYSTEM_CHANGED,
    beliefSystemId: id,
  });
  const testId = id ? `belief-system-option-${id}` : 'belief-system-option-none';

  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={_select}
      style={[styles.suggestion, selected ? styles.suggestionSelected : null]}
      testID={testId}
    >
      <View style={[styles.radio, selected ? styles.radioSelected : null]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <Text style={styles.suggestionText}>
        {id ? beliefSystemText(id) : noBeliefSystemText()}
      </Text>
    </PressableScale>
  );
}

function BeliefSystemSuggestion({
  disabled,
  id,
  selected,
}: {
  disabled: boolean;
  id: BeliefSystemId;
  selected: boolean;
}) {
  const actor = useAppNavigationActor();
  const _toggle = () => actor.send({
    type: CHECK_IN_EVENTS.BELIEF_SYSTEM_CHANGED,
    beliefSystemId: selected ? null : id,
  });

  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={_toggle}
      style={[styles.suggestion, selected ? styles.suggestionSelected : null]}
      testID={`belief-system-suggestion-${id}`}
    >
      <View style={[styles.radio, selected ? styles.radioSelected : null]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <Text style={styles.suggestionText}>{beliefSystemText(id)}</Text>
    </PressableScale>
  );
}

function SelectionSummary({
  color,
  emotion,
  nuance,
}: {
  color: string;
  emotion: string;
  nuance: string;
}) {
  return (
    <View style={styles.selectionRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.selectionCopy}>
        <Text style={styles.emotion}>{emotion}</Text>
        <Text style={styles.nuance}>{nuance}</Text>
      </View>
    </View>
  );
}

/* oxlint-disable jsx-a11y/no-autofocus -- Reflection is an explicit writing step; create and edit modes have regression coverage. */
function ReflectionNoteStep() {
  const actor = useAppNavigationActor();
  const snapshot = useSelector(actor, _selectSnapshot);
  const selection = snapshot.context.selection;
  const saving = snapshot.matches(CHECK_IN_STATES.SAVING);
  const failed = snapshot.matches(CHECK_IN_STATES.FAILURE);
  const editingEntry = snapshot.context.editing;
  const editing = editingEntry !== null;

  const _noteChanged = (note: string) => actor.send({ type: CHECK_IN_EVENTS.NOTE_CHANGED, note });
  const _back = () => actor.send({ type: CHECK_IN_EVENTS.REFLECTION_CANCELLED });
  const _submit = () => actor.send({
    type: failed ? CHECK_IN_EVENTS.RETRIED : CHECK_IN_EVENTS.CONFIRMED,
  });
  const _editSelection = () => actor.send({ type: CHECK_IN_EVENTS.EDIT_SELECTION_REQUESTED });
  const _delete = () => {
    if (editingEntry) {
      actor.send({ type: CHECK_IN_EVENTS.DELETE_REQUESTED, id: editingEntry.id });
    }
  };
  const _confirmDelete = () => confirmCheckInDeletion(_delete);

  if (!selection) return null;

  return (
    <View style={styles.page} testID="reflection-screen">
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAwareScrollView
          bottomOffset={REFLECTION_KEYBOARD_BOTTOM_OFFSET}
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          testID="reflection-keyboard-scroll"
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              {editing
                ? <fbt desc="Label for editing an existing check-in">EDIT MOMENT · STEP 1 OF 2</fbt>
                : <fbt desc="Second step label for reflecting on a feeling">02 · REFLECT · STEP 1 OF 2</fbt>}
            </Text>
            <Text style={styles.title}>
              {editing
                ? <fbt desc="Title for editing an existing check-in">Edit this moment.</fbt>
                : <fbt desc="Reflection screen question">What is present right now?</fbt>}
            </Text>
            <Text style={styles.copy}>
              <fbt desc="Gentle instructions for the optional reflection">
                You do not have to explain anything. A few words can help hold onto the moment.
              </fbt>
            </Text>
          </View>
          <View style={styles.card}>
            <PressableScale
              accessibilityRole={editing ? 'button' : undefined}
              disabled={!editing || saving}
              onPress={_editSelection}
              style={styles.selectionRow}
            >
              <View style={[styles.dot, { backgroundColor: selection.color }]} />
              <View style={styles.selectionCopy}>
                <Text style={styles.emotion}>{emotionName(selection.emotionId)}</Text>
                <Text style={styles.nuance}>{emotionNuance(selection)}</Text>
              </View>
              {editing ? (
                <Text style={styles.changeSelection}>
                  <fbt desc="Button for changing the feeling of an existing check-in">
                    Change feeling
                  </fbt>
                </Text>
              ) : null}
            </PressableScale>
            <TextInput
              accessibilityLabel={optionalNoteAccessibilityLabel()}
              autoFocus
              editable={!saving}
              maxLength={240}
              multiline
              onChangeText={_noteChanged}
              placeholder={optionalNotePlaceholder()}
              placeholderTextColor="#A39A8F"
              returnKeyType="done"
              style={styles.input}
              submitBehavior="blurAndSubmit"
              testID="reflection-note-input"
              value={snapshot.context.note}
            />
            {failed ? (
              <Text style={styles.error}>
                <fbt desc="Error shown when saving a reflection fails">
                  Your reflection could not be saved.
                </fbt>
              </Text>
            ) : null}
            <View style={styles.actions}>
              <PressableScale
                accessibilityRole="button"
                disabled={saving}
                onPress={_back}
                style={styles.secondaryButton}
                testID="reflection-back"
              >
                <Text style={styles.secondaryText}>
                  <fbt desc="Button returning from reflection to the emotion star">Back</fbt>
                </Text>
              </PressableScale>
              <PressableScale
                accessibilityRole="button"
                disabled={saving}
                onPress={_submit}
                style={styles.primaryButton}
                testID="reflection-save"
              >
                {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                  <Text style={styles.primaryText}>
                    {failed
                      ? <fbt desc="Button retrying a failed reflection save">Try again</fbt>
                      : <fbt desc="Button saving reflection before optional core belief step">Save reflection</fbt>}
                  </Text>
                )}
              </PressableScale>
            </View>
            {editing ? (
              <View style={styles.deleteSection}>
                <PressableScale
                  accessibilityLabel={deleteMomentAccessibilityLabel()}
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={_confirmDelete}
                  style={styles.deleteMomentButton}
                  testID="delete-edited-moment"
                >
                  <Text style={styles.deleteMomentText}>{deleteMomentText()}</Text>
                </PressableScale>
              </View>
            ) : null}
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}
/* oxlint-enable jsx-a11y/no-autofocus */

function BeliefSystemStep() {
  const actor = useAppNavigationActor();
  const snapshot = useSelector(actor, _selectSnapshot);
  const history = useStoreSelector(checkInHistoryStore, _selectHistory);
  const selection = snapshot.context.selection;
  const selectedId = snapshot.context.beliefSystemId;
  const recommendations = selection
    ? recommendedBeliefSystemIds({ emotionId: selection.emotionId, history })
    : [];
  const initialSuggestions = recommendations.slice(0, 3);
  const quickSuggestions = selectedId && !initialSuggestions.includes(selectedId)
    ? [selectedId, ...initialSuggestions.slice(0, 2)]
    : initialSuggestions;
  const attaching = snapshot.matches(CHECK_IN_STATES.ATTACHING_BELIEF_SYSTEM);
  const failed = snapshot.matches(CHECK_IN_STATES.BELIEF_SYSTEM_FAILURE);

  const _back = () => actor.send({ type: CHECK_IN_EVENTS.BELIEF_SYSTEM_BACK_REQUESTED });
  const _browse = () => actor.send({ type: CHECK_IN_EVENTS.BELIEF_SYSTEM_CATALOG_REQUESTED });
  const _finish = () => actor.send({
    type: failed ? CHECK_IN_EVENTS.RETRIED : CHECK_IN_EVENTS.CONFIRMED,
  });

  if (!selection) return null;

  return (
    <View style={styles.page} testID="reflection-screen">
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          testID="belief-system-step"
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              <fbt desc="Optional core belief step label">03 · CORE BELIEF · STEP 2 OF 2</fbt>
            </Text>
            <Text style={styles.title}>
              <fbt desc="Question shown after a reflection is saved">
                Does a core belief fit this moment?
              </fbt>
            </Text>
            <Text style={styles.copy}>
              <fbt desc="Explanation that the reflection was saved before core belief selection">
                Your reflection is already saved. Add one only if it feels useful.
              </fbt>
            </Text>
          </View>
          <View style={styles.savedStatus}>
            <Text style={styles.savedStatusMark}>✓</Text>
            <Text style={styles.savedStatusText}>
              <fbt desc="Confirmation that the reflection text is persisted">Reflection saved</fbt>
            </Text>
          </View>
          <View style={styles.card}>
            <SelectionSummary
              color={selection.color}
              emotion={emotionName(selection.emotionId)}
              nuance={emotionNuance(selection)}
            />
            <Text style={styles.beliefSystemHelp}>
              <fbt desc="Explanation of personalized core belief suggestions">
                Suggestions match this feeling and what you attached before.
              </fbt>
            </Text>
            <View accessibilityRole="radiogroup" style={styles.suggestions}>
              {quickSuggestions.map((id) => (
                <BeliefSystemSuggestion
                  disabled={attaching}
                  id={id}
                  key={id}
                  selected={selectedId === id}
                />
              ))}
            </View>
            <PressableScale
              accessibilityRole="button"
              disabled={attaching}
              onPress={_browse}
              style={styles.browseButton}
              testID="belief-system-browse"
            >
              <View style={styles.browseCopy}>
                <Text style={styles.browseTitle}>
                  <fbt desc="Button opening the complete core belief catalog">
                    Browse all core beliefs
                  </fbt>
                </Text>
                <Text style={styles.browseHelp}>
                  <fbt desc="Description below the button opening all core beliefs">
                    See the complete list
                  </fbt>
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </PressableScale>
            {failed ? (
              <Text style={styles.error}>
                <fbt desc="Error shown when optional core belief attachment fails">
                  Your reflection is saved, but the core belief could not be attached.
                </fbt>
              </Text>
            ) : null}
            <View style={styles.actions}>
              <PressableScale
                accessibilityRole="button"
                disabled={attaching}
                onPress={_back}
                style={styles.secondaryButton}
                testID="belief-system-back"
              >
                <Text style={styles.secondaryText}>
                  <fbt desc="Button returning to the saved reflection text">Back</fbt>
                </Text>
              </PressableScale>
              <PressableScale
                accessibilityRole="button"
                disabled={attaching}
                onPress={_finish}
                style={styles.primaryButton}
                testID="belief-system-finish"
              >
                {attaching ? <ActivityIndicator color="#FFFFFF" /> : (
                  <Text style={styles.primaryText}>
                    {failed
                      ? <fbt desc="Button retrying core belief attachment">Try again</fbt>
                      : selectedId
                        ? <fbt desc="Button attaching the selected core belief">Attach and finish</fbt>
                        : <fbt desc="Button finishing without a core belief">Finish without one</fbt>}
                  </Text>
                )}
              </PressableScale>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function BeliefSystemCatalogStep() {
  const actor = useAppNavigationActor();
  const snapshot = useSelector(actor, _selectSnapshot);
  const history = useStoreSelector(checkInHistoryStore, _selectHistory);
  const selection = snapshot.context.selection;
  const recommendations = selection
    ? recommendedBeliefSystemIds({ emotionId: selection.emotionId, history })
    : [];
  const _close = () => actor.send({ type: CHECK_IN_EVENTS.BELIEF_SYSTEM_CATALOG_CLOSED });

  if (!selection) return null;

  return (
    <View style={styles.page} testID="reflection-screen">
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          testID="belief-system-catalog"
        >
          <View style={styles.catalogHeader}>
            <PressableScale
              accessibilityRole="button"
              onPress={_close}
              style={styles.catalogBack}
              testID="belief-system-catalog-back"
            >
              <Text style={styles.secondaryText}>‹ <fbt desc="Button returning from the core belief catalog">Back</fbt></Text>
            </PressableScale>
            <Text style={styles.eyebrow}>
              <fbt desc="Label above the complete core belief catalog">CORE BELIEFS</fbt>
            </Text>
            <Text style={styles.title}>
              <fbt desc="Title for the complete core belief catalog">Choose what feels familiar.</fbt>
            </Text>
            <Text style={styles.copy}>
              <fbt desc="Instructions for selecting from the complete core belief catalog">
                Selecting an option returns to your suggestions. You can change it again before finishing.
              </fbt>
            </Text>
          </View>
          <View accessibilityRole="radiogroup" style={styles.catalogList}>
            <BeliefSystemOption
              disabled={false}
              id={null}
              selected={snapshot.context.beliefSystemId === null}
            />
            {recommendations.map((id) => (
              <BeliefSystemOption
                disabled={false}
                id={id}
                key={id}
                selected={snapshot.context.beliefSystemId === id}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export function ReflectionScreen() {
  const actor = useAppNavigationActor();
  const snapshot = useSelector(actor, _selectSnapshot);

  if (snapshot.matches(NAVIGATION_STATES.TABS)) return null;
  if (snapshot.matches(CHECK_IN_STATES.BELIEF_SYSTEM_CATALOG)) {
    return <BeliefSystemCatalogStep />;
  }
  if (
    snapshot.matches(CHECK_IN_STATES.BELIEF_SYSTEM)
    || snapshot.matches(CHECK_IN_STATES.ATTACHING_BELIEF_SYSTEM)
    || snapshot.matches(CHECK_IN_STATES.BELIEF_SYSTEM_FAILURE)
  ) {
    return <BeliefSystemStep />;
  }
  return <ReflectionNoteStep />;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  safeArea: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: 22,
    paddingBottom: 32,
  },
  header: { marginTop: 24 },
  catalogHeader: { marginTop: 8 },
  eyebrow: {
    fontFamily: type.semibold,
    color: palette.inkMuted,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  title: { fontFamily: type.semibold, color: palette.ink, fontSize: 34, marginTop: 8 },
  copy: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  card: {
    marginTop: 28,
    padding: 20,
    borderRadius: 26,
    backgroundColor: palette.paperRaised,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  selectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  selectionCopy: { flex: 1 },
  dot: { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
  emotion: { fontFamily: type.semibold, color: palette.ink, fontSize: 16 },
  nuance: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 13 },
  changeSelection: { fontFamily: type.semibold, color: palette.moss, fontSize: 12 },
  input: {
    minHeight: 150,
    borderRadius: 18,
    backgroundColor: '#F0EAE0',
    padding: 16,
    fontFamily: type.regular,
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  savedStatus: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.paperRaised,
  },
  savedStatusMark: { fontFamily: type.semibold, color: palette.ink, fontSize: 12 },
  savedStatusText: { fontFamily: type.medium, color: palette.ink, fontSize: 12 },
  beliefSystemHelp: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  suggestions: { gap: 8, paddingTop: 12 },
  suggestion: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: palette.paper,
  },
  suggestionSelected: { borderColor: palette.moss, backgroundColor: '#EDF0EB' },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: palette.inkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: palette.moss },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.moss },
  suggestionText: {
    flex: 1,
    fontFamily: type.medium,
    color: palette.ink,
    fontSize: 13,
    lineHeight: 18,
  },
  browseButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.paper,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  browseCopy: { flex: 1 },
  browseTitle: { fontFamily: type.semibold, color: palette.ink, fontSize: 14 },
  browseHelp: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 12, marginTop: 2 },
  chevron: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 28, lineHeight: 30 },
  catalogBack: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: 10,
  },
  catalogList: { gap: 8, paddingTop: 24 },
  error: { fontFamily: type.medium, color: palette.danger, fontSize: 12, marginTop: 10 },
  deleteSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
  },
  deleteMomentButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.danger,
  },
  deleteMomentText: { fontFamily: type.semibold, color: palette.danger, fontSize: 14 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryButton: {
    minHeight: 50,
    flex: 1,
    backgroundColor: palette.ink,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryText: { fontFamily: type.semibold, color: '#FFFFFF', fontSize: 14 },
  secondaryButton: {
    minHeight: 50,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontFamily: type.semibold, color: palette.ink, fontSize: 14 },
});
