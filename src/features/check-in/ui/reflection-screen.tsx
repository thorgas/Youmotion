import { useSelector } from '@xstate/react';
import { useSelector as useStoreSelector } from '@xstate/store-react';
import {
  DateTimePicker,
  type DateTimePickerProps,
} from '@expo/ui/community/datetime-picker';
import { useFocusEffect } from 'expo-router';
import { fbs } from 'fbtee';
import { PressableScale } from 'pressto';
import { useRef } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  KeyboardAwareScrollView,
  useKeyboardState,
} from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import assert from 'tiny-invariant';

import { AppBackButton } from '@/components/ui/app-back-button';
import { ConfirmedPickerModal } from '@/components/ui/confirmed-picker-modal';
import {
  CHECK_IN_EVENTS,
  CHECK_IN_STATES,
  MAX_BELIEF_STATEMENT_LENGTH,
  MAX_NOTE_LENGTH,
  MOMENT_TIME_PICKER_MODES,
  NAVIGATION_STATES,
  REFLECTION_KEYBOARD_BOTTOM_OFFSET,
} from '@/constants';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import {
  formatHistoryDate,
  formatMomentDate,
  formatMomentTime,
} from '@/localization/date-copy';
import { appSettingsStore } from '@/features/settings/application/app-settings.store';
import {
  emotionName,
  emotionNuance,
  optionalNoteAccessibilityLabel,
  optionalNotePlaceholder,
} from './emotion-copy';
import { checkInHistoryStore } from '../application/check-in-history.store';
import {
  checkInTimestampFromDate,
  type CheckIn,
  type EmotionSelection,
} from '../domain/check-in';
import {
  recommendedBeliefSystemIds,
} from '../domain/belief-system';
import type {
  BeliefStatement,
  BeliefSystemId,
} from '../domain/belief-statement';
import {
  beliefSystemText,
  customBeliefAccessibilityLabel,
  customBeliefPlaceholder,
  noBeliefSystemText,
} from './belief-system-copy';
import {
  confirmCheckInDeletion,
  deleteMomentAccessibilityLabel,
  deleteMomentText,
} from './check-in-deletion';
import { CheckInProgressHeader } from './check-in-progress';
import { PersonalBeliefCreateButton } from './personal-belief-create-button';
import { beginReflectionInputSession } from './reflection-input-session';
import { reflectionResponsiveLayout } from './reflection-responsive-layout';
import { actionColors, overlayColors, palette, surfaceColors, type } from '@/theme';

const _selectSnapshot = (
  snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>,
) => snapshot;
const _selectHistory = (
  state: ReturnType<typeof checkInHistoryStore.getSnapshot>,
) => state.context.entries;
const _selectLocale = (
  state: ReturnType<typeof appSettingsStore.getSnapshot>,
) => state.context.locale;

export function MomentTimeControl({ disabled }: { disabled: boolean }) {
  const actor = useAppNavigationActor();
  const snapshot = useSelector(actor, _selectSnapshot);
  const locale = useStoreSelector(appSettingsStore, _selectLocale);
  const occurredAt = snapshot.context.occurredAtDraft;
  const pickerMode = snapshot.context.momentTimePickerMode;
  assert(occurredAt === null || !Number.isNaN(new Date(occurredAt).getTime()), 'Moment time must be a valid timestamp.');
  assert(pickerMode === null || pickerMode === 'date' || pickerMode === 'time', 'Moment picker mode must be supported.');
  const _open = () => {
    Keyboard.dismiss();
    actor.send({ type: CHECK_IN_EVENTS.MOMENT_TIME_EDITOR_OPENED });
  };
  const _close = () => actor.send({ type: CHECK_IN_EVENTS.MOMENT_TIME_EDITOR_CLOSED });
  const _confirm = () => actor.send({
    type: CHECK_IN_EVENTS.MOMENT_TIME_EDITOR_CONFIRMED,
  });
  const _requestDate = () => actor.send({
    type: CHECK_IN_EVENTS.MOMENT_TIME_DATE_REQUESTED,
  });
  const _requestTime = () => actor.send({
    type: CHECK_IN_EVENTS.MOMENT_TIME_TIME_REQUESTED,
  });
  const _dismissPicker = () => actor.send({
    type: CHECK_IN_EVENTS.MOMENT_TIME_PICKER_DISMISSED,
  });
  const _reset = () => actor.send({ type: CHECK_IN_EVENTS.MOMENT_TIME_RESET });
  const _change: NonNullable<DateTimePickerProps['onValueChange']> = (...parameters) => {
    actor.send({
      type: CHECK_IN_EVENTS.MOMENT_TIME_CHANGED,
      occurredAt: checkInTimestampFromDate(parameters[1]),
    });
  };
  const now = new Date();
  if (!occurredAt) return null;
  const value = new Date(occurredAt);
  const label = formatHistoryDate({ date: value, locale });
  const editorValue = new Date(snapshot.context.momentTimeEditorDraft ?? occurredAt);
  const editorLabel = formatHistoryDate({ date: editorValue, locale });

  return (
    <>
      <Pressable
        accessibilityHint={String(fbs(
          'Change when this emotion happened',
          'Hint for opening the emotion date and time editor',
        ))}
        accessibilityLabel={label}
        accessibilityRole="button"
        disabled={disabled}
        onPress={_open}
        style={styles.momentTimePill}
        testID="moment-time-control"
      >
        <Text style={styles.momentTimeIcon}>◷</Text>
        <Text numberOfLines={2} style={styles.momentTimeText}>{label}</Text>
        <Text accessibilityElementsHidden style={styles.momentTimeDisclosure}>›</Text>
      </Pressable>
      <Modal
        animationType="fade"
        onRequestClose={_close}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={snapshot.context.momentTimeEditorOpen}
      >
        <View style={styles.momentTimeModalBackdrop} testID="moment-time-modal">
          <Pressable
            accessibilityElementsHidden
            importantForAccessibility="no"
            onPress={_close}
            style={styles.momentTimeModalDismissArea}
            testID="moment-time-modal-backdrop"
          />
          <View accessibilityViewIsModal style={styles.momentTimeModalCard}>
            <View style={styles.momentTimeModalHeader}>
              <View style={styles.momentTimeModalHeading}>
                <Text style={styles.momentTimeModalTitle}>
                  <fbt desc="Heading above the emotion date and time editor">When was this?</fbt>
                </Text>
                <Text style={styles.momentTimeModalValue}>{editorLabel}</Text>
              </View>
            </View>
            <View style={styles.momentTimePickerSection}>
              <View style={styles.momentTimeAndroidControls}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={_requestDate}
                    style={styles.momentTimeAndroidButton}
                    testID="moment-time-date-picker"
                  >
                    <Text style={styles.momentTimeAndroidLabel}>
                      <fbt desc="Button opening the date picker for an emotion">Date</fbt>
                    </Text>
                    <Text style={styles.momentTimeAndroidValue}>
                      {formatMomentDate({ date: editorValue, locale })}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={_requestTime}
                    style={styles.momentTimeAndroidButton}
                    testID="moment-time-time-picker"
                  >
                    <Text style={styles.momentTimeAndroidLabel}>
                      <fbt desc="Button opening the time picker for an emotion">Time</fbt>
                    </Text>
                    <Text style={styles.momentTimeAndroidValue}>
                      {formatMomentTime({ date: editorValue, locale })}
                    </Text>
                  </Pressable>
                  {Platform.OS === 'ios' ? (
                    <ConfirmedPickerModal
                      doneLabel={String(fbs('Done', 'Confirm moment date or time picker button'))}
                      onDone={_dismissPicker}
                      testID="moment-time-picker-modal"
                      title={pickerMode === MOMENT_TIME_PICKER_MODES.DATE
                        ? String(fbs('Choose a date', 'Moment date picker modal title'))
                        : String(fbs('Choose a time', 'Moment time picker modal title'))}
                      visible={pickerMode !== null}
                    >
                      <DateTimePicker
                        accentColor={palette.moss}
                        display="spinner"
                        maximumDate={now}
                        mode={pickerMode ?? MOMENT_TIME_PICKER_MODES.DATE}
                        onValueChange={_change}
                        value={editorValue}
                      />
                    </ConfirmedPickerModal>
                  ) : pickerMode ? (
                    <DateTimePicker
                      accentColor={palette.moss}
                      maximumDate={now}
                      mode={pickerMode}
                      onDismiss={_dismissPicker}
                      onValueChange={_change}
                      presentation="dialog"
                      value={editorValue}
                    />
                  ) : null}
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={_reset}
              style={styles.momentTimeReset}
            >
              <Text style={styles.momentTimeResetText}>
                <fbt desc="Button setting an emotion's date and time to the present">Set to now</fbt>
              </Text>
            </Pressable>
            <View style={styles.momentTimeModalActions}>
              <PressableScale
                accessibilityRole="button"
                onPress={_close}
                style={styles.momentTimeCancel}
                testID="cancel-moment-time"
              >
                <Text style={styles.momentTimeCancelText}>
                  <fbt desc="Button discarding changes in the emotion date and time editor">
                    Cancel
                  </fbt>
                </Text>
              </PressableScale>
              <PressableScale
                accessibilityRole="button"
                onPress={_confirm}
                style={styles.momentTimeConfirm}
                testID="confirm-moment-time"
              >
                <Text style={styles.momentTimeConfirmText}>
                  <fbt desc="Button applying changes in the emotion date and time editor">
                    Set date and time
                  </fbt>
                </Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function recommendationsForSelection({
  history,
  selection,
  statements,
}: {
  history: readonly CheckIn[];
  selection: EmotionSelection | null;
  statements: readonly BeliefStatement[];
}) {
  assert(selection === null || selection.intensity >= 0 && selection.intensity <= 1, 'Recommendation selection intensity must be normalized.');
  assert(history.every((entry) => entry.id.length > 0), 'Recommendation history requires identifiers.');
  if (!selection) return [];
  return recommendedBeliefSystemIds({
    emotionId: selection.emotionId,
    history,
    statements,
  });
}

function BeliefSystemOption({
  disabled,
  id,
  selected,
  statements,
}: {
  disabled: boolean;
  id: BeliefSystemId | null;
  selected: boolean;
  statements: readonly BeliefStatement[];
}) {
  assert(id === null || id.length > 0, 'Belief option identifier must not be empty.');
  assert(statements.every((statement) => statement.beliefSystemId.length > 0), 'Belief options require statement identifiers.');
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
        {id ? beliefSystemText({ id, statements }) : noBeliefSystemText()}
      </Text>
    </PressableScale>
  );
}

function BeliefSystemSuggestion({
  disabled,
  id,
  selected,
  statements,
}: {
  disabled: boolean;
  id: BeliefSystemId;
  selected: boolean;
  statements: readonly BeliefStatement[];
}) {
  assert(id.length > 0, 'Belief suggestion identifier must not be empty.');
  assert(statements.every((statement) => statement.beliefSystemId.length > 0), 'Belief suggestions require statement identifiers.');
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
      <Text style={styles.suggestionText}>{beliefSystemText({ id, statements })}</Text>
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

function ReflectionEditorActions({
  editing,
  failed,
  onConfirmDelete,
  onSave,
  onSaveForNow,
  saveForNowVisible,
  saving,
}: {
  editing: boolean;
  failed: boolean;
  onConfirmDelete: () => void;
  onSave: () => void;
  onSaveForNow: () => void;
  saveForNowVisible: boolean;
  saving: boolean;
}) {
  return (
    <>
      <PressableScale
        accessibilityRole="button"
        disabled={saving}
        onPress={onSave}
        style={[styles.primaryButton, styles.standalonePrimaryButton]}
        testID="reflection-save"
      >
        {saving ? <ActivityIndicator color={actionColors.primaryForeground} /> : (
          <Text style={styles.primaryText}>
            {failed
              ? <fbt desc="Button retrying a failed reflection save">Try again</fbt>
              : editing
                ? <fbt desc="Button saving changes to an existing moment">Save changes</fbt>
                : <fbt desc="Button saving a reflection and continuing to its underlying belief">Continue reflection</fbt>}
          </Text>
        )}
      </PressableScale>
      {saveForNowVisible ? (
        <PressableScale
          accessibilityRole="button"
          onPress={onSaveForNow}
          style={styles.saveForNowButton}
          testID="reflection-save-for-now"
        >
          <Text style={styles.saveForNowText}>
            <fbt desc="Button saving only the selected feeling without further reflection">Save this moment and finish</fbt>
          </Text>
        </PressableScale>
      ) : null}
      {editing ? (
        <View style={styles.deleteSection}>
          <PressableScale
            accessibilityLabel={deleteMomentAccessibilityLabel()}
            accessibilityRole="button"
            disabled={saving}
            onPress={onConfirmDelete}
            style={styles.deleteMomentButton}
            testID="delete-edited-moment"
          >
            <Text style={styles.deleteMomentText}>{deleteMomentText()}</Text>
          </PressableScale>
        </View>
      ) : null}
    </>
  );
}

export function ReflectionNoteHeader() {
  return (
    <View style={styles.noteLabelRow} testID="reflection-note-header">
      <Text style={styles.noteLabel}>
        <fbt desc="Optional reflection note field label">A NOTE FOR LATER</fbt>
      </Text>
      <Text style={styles.noteOptionality} testID="reflection-note-optionality">
        <fbt desc="Label clarifying that the reflection note is optional">OPTIONAL</fbt>
      </Text>
    </View>
  );
}

function ReflectionNoteStep() {
  const actor = useAppNavigationActor();
  const snapshot = useSelector(actor, _selectSnapshot);
  const input = useRef<TextInput>(null);
  const window = useWindowDimensions();
  const keyboard = useKeyboardState((state) => ({
    height: state.height,
    isVisible: state.isVisible,
  }));
  const responsive = reflectionResponsiveLayout({
    height: window.height,
    keyboardHeight: keyboard.height,
    keyboardVisible: keyboard.isVisible,
    platform: Platform.OS,
    width: window.width,
  });
  const selection = snapshot.context.selection;
  const saving = snapshot.matches(CHECK_IN_STATES.SAVING);
  const failed = snapshot.matches(CHECK_IN_STATES.FAILURE);
  const editingEntry = snapshot.context.editing;
  const editing = editingEntry !== null;
  const saveForNowVisible = ![editing, saving, failed].includes(true);
  assert(snapshot.context.note.length <= MAX_NOTE_LENGTH, 'Reflection note must respect its input limit.');
  assert(selection === null || selection.intensity >= 0 && selection.intensity <= 1, 'Reflection selection intensity must be normalized.');

  const _noteChanged = (note: string) => actor.send({ type: CHECK_IN_EVENTS.NOTE_CHANGED, note });
  const _back = () => actor.send({ type: CHECK_IN_EVENTS.REFLECTION_CANCELLED });
  const _submit = () => actor.send({
    type: failed ? CHECK_IN_EVENTS.RETRIED : CHECK_IN_EVENTS.CONFIRMED,
  });
  const _saveForNow = () => actor.send({ type: CHECK_IN_EVENTS.SAVE_FOR_NOW_REQUESTED });
  const _editSelection = () => actor.send({ type: CHECK_IN_EVENTS.EDIT_SELECTION_REQUESTED });
  const _delete = () => {
    if (editingEntry) {
      actor.send({ type: CHECK_IN_EVENTS.DELETE_REQUESTED, id: editingEntry.id });
    }
  };
  const _confirmDelete = () => confirmCheckInDeletion(_delete);
  const _focusInput = () => beginReflectionInputSession(input.current);
  useFocusEffect(_focusInput);

  if (!selection) return null;

  return (
    <View style={styles.page} testID="reflection-screen">
      <SafeAreaView style={styles.safeArea}>
        <CheckInProgressHeader
          activeStep={1}
          compact={responsive.compact}
          context={editing ? 'editing' : 'reflection'}
        />
        <KeyboardAwareScrollView
          bottomOffset={responsive.bottomOffset}
          contentContainerStyle={[
            styles.content,
            styles.flowContent,
            {
              paddingHorizontal: responsive.contentHorizontalPadding,
              paddingTop: responsive.contentTopPadding,
            },
          ]}
          enabled={responsive.keyboardAwareScrollEnabled}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          testID="reflection-keyboard-scroll"
        >
          <View style={styles.reflectionHeading}>
            <AppBackButton
              disabled={saving}
              onPress={_back}
              testID="reflection-back"
            />
            <View style={styles.momentMetadataRow}>
              <PressableScale
                accessibilityRole={editing ? 'button' : undefined}
                disabled={!editing || saving}
                onPress={_editSelection}
                style={styles.selectionPill}
              >
                <View style={[styles.dot, { backgroundColor: selection.color }]} />
                <Text style={styles.selectionPillText}>
                  {emotionName(selection.emotionId)} · {emotionNuance(selection)}
                </Text>
                {editing ? (
                  <Text style={styles.changeSelection}>
                    <fbt desc="Button for changing the feeling of an existing check-in">
                      Change
                    </fbt>
                  </Text>
                ) : null}
              </PressableScale>
              <MomentTimeControl disabled={saving} />
            </View>
            <Text
              style={[
                styles.title,
                {
                  fontSize: responsive.titleFontSize,
                  lineHeight: responsive.titleLineHeight,
                },
              ]}
            >
              {editing
                ? <fbt desc="Title for editing an existing check-in">Edit this moment.</fbt>
                : <fbt desc="Reflection screen question">What is present right now?</fbt>}
            </Text>
            <Text style={styles.copy}>
              <fbt desc="Concrete benefit of adding a short reflection">
                A few words make this moment easier to remember—and give future insights something real to work with.
              </fbt>
            </Text>
          </View>
          <View
            style={[
              styles.reflectionEditor,
              {
                marginTop: responsive.cardMarginTop,
                padding: responsive.cardPadding,
              },
            ]}
          >
            <ReflectionNoteHeader />
            <TextInput
              accessibilityLabel={optionalNoteAccessibilityLabel()}
              editable={!saving}
              maxLength={MAX_NOTE_LENGTH}
              multiline
              onChangeText={_noteChanged}
              onSubmitEditing={_submit}
              placeholder={optionalNotePlaceholder()}
              placeholderTextColor={palette.inkMuted}
              returnKeyType="done"
              ref={input}
              style={[styles.input, { minHeight: responsive.inputMinHeight }]}
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
            {!editing ? (
              <View style={styles.nextStep}>
                <Text style={styles.nextStepLabel}>
                  <fbt desc="Label introducing the next guided reflection step">UP NEXT</fbt>
                </Text>
                <Text style={styles.nextStepCopy}>
                  <fbt desc="Explanation of the guided belief step after reflection">
                    Gently explore what may be underneath. You can stop at any time.
                  </fbt>
                </Text>
              </View>
            ) : null}
            <ReflectionEditorActions
              editing={editing}
              failed={failed}
              onConfirmDelete={_confirmDelete}
              onSave={_submit}
              onSaveForNow={_saveForNow}
              saveForNowVisible={saveForNowVisible}
              saving={saving}
            />
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}

function BeliefSystemStep() {
  const actor = useAppNavigationActor();
  const snapshot = useSelector(actor, _selectSnapshot);
  const history = useStoreSelector(checkInHistoryStore, _selectHistory);
  const selection = snapshot.context.selection;
  const selectedId = snapshot.context.beliefSystemId;
  const statements = snapshot.context.beliefStatements;
  const recommendations = recommendationsForSelection({
    history,
    selection,
    statements,
  });
  const initialSuggestions = recommendations.slice(0, 3);
  const quickSuggestions = selectedId && !initialSuggestions.includes(selectedId)
    ? [selectedId, ...initialSuggestions.slice(0, 2)]
    : initialSuggestions;
  const attaching = snapshot.matches(CHECK_IN_STATES.ATTACHING_BELIEF_SYSTEM);
  const failed = snapshot.matches(CHECK_IN_STATES.BELIEF_SYSTEM_FAILURE);
  assert(selection === null || selection.intensity >= 0 && selection.intensity <= 1, 'Belief step selection intensity must be normalized.');
  assert(quickSuggestions.length <= 3, 'Quick belief suggestions must remain bounded.');

  const _back = () => actor.send({ type: CHECK_IN_EVENTS.BELIEF_SYSTEM_BACK_REQUESTED });
  const _browse = () => actor.send({ type: CHECK_IN_EVENTS.BELIEF_SYSTEM_CATALOG_REQUESTED });
  const _finish = () => actor.send({
    type: failed ? CHECK_IN_EVENTS.RETRIED : CHECK_IN_EVENTS.CONFIRMED,
  });

  if (!selection) return null;

  return (
    <View style={styles.page} testID="reflection-screen">
      <SafeAreaView style={styles.safeArea}>
        <CheckInProgressHeader
          activeStep={2}
          context="core-belief"
        />
        <ScrollView
          contentContainerStyle={[styles.content, styles.flowContent]}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          testID="belief-system-step"
        >
          <View>
            <Text style={styles.title}>
              <fbt desc="Question shown after a reflection is saved">
                Does a core belief fit this moment?
              </fbt>
            </Text>
            <Text style={styles.copy}>
              <fbt desc="Explanation of a restrictive core belief">
                A core belief is an inner rule that limits you in this moment.
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
                  statements={statements}
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
                {attaching ? (
                  <ActivityIndicator color={actionColors.primaryForeground} />
                ) : (
                  <Text style={styles.primaryText}>
                    {failed
                      ? <fbt desc="Button retrying core belief attachment">Try again</fbt>
                      : selectedId
                        ? <fbt desc="Button attaching the selected core belief and continuing">Attach and continue</fbt>
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
  const statements = snapshot.context.beliefStatements;
  const recommendations = recommendationsForSelection({
    history,
    selection,
    statements,
  });
  assert(selection === null || selection.intensity >= 0 && selection.intensity <= 1, 'Belief catalog selection intensity must be normalized.');
  assert(recommendations.every((id) => id.length > 0), 'Belief recommendations require identifiers.');
  const _close = () => actor.send({ type: CHECK_IN_EVENTS.BELIEF_SYSTEM_CATALOG_CLOSED });
  const _create = () => actor.send({
    type: CHECK_IN_EVENTS.CUSTOM_BELIEF_SYSTEM_REQUESTED,
  });
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
            <AppBackButton
              onPress={_close}
              style={styles.catalogBack}
              testID="belief-system-catalog-back"
            />
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
          <PersonalBeliefCreateButton
            onPress={_create}
            style={styles.createBeliefButtonSpacing}
            testID="create-custom-belief"
          />
          <View accessibilityRole="radiogroup" style={styles.catalogList}>
            <BeliefSystemOption
              disabled={false}
              id={null}
              selected={snapshot.context.beliefSystemId === null}
              statements={statements}
            />
            {recommendations.map((id) => (
              <BeliefSystemOption
                disabled={false}
                id={id}
                key={id}
                selected={snapshot.context.beliefSystemId === id}
                statements={statements}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function BeliefEditorHeader() {
  return (
    <View style={styles.catalogHeader}>
      <Text style={styles.eyebrow}>
        <fbt desc="Label above the personal core belief editor">YOUR CORE BELIEF</fbt>
      </Text>
      <Text style={styles.title}>
        <fbt desc="Title for adding a personal core belief">Add your own core belief.</fbt>
      </Text>
      <Text style={styles.copy}>
        <fbt desc="Instructions for adding a personal harmful belief">
          Name the belief that causes suffering. You can give it a new direction after attaching it.
        </fbt>
      </Text>
    </View>
  );
}

function BeliefEditorFields({
  beliefStatementDraft,
  onBeliefChanged,
  saving,
}: {
  beliefStatementDraft: string;
  onBeliefChanged: (statement: string) => void;
  saving: boolean;
}) {
  return (
    <View style={styles.editorField}>
      <Text style={styles.editorLabel}>
        <fbt desc="Label for a personal harmful core belief">Core belief</fbt>
      </Text>
      <TextInput
        accessibilityLabel={customBeliefAccessibilityLabel()}
        editable={!saving}
        maxLength={MAX_BELIEF_STATEMENT_LENGTH}
        multiline
        onChangeText={onBeliefChanged}
        placeholder={customBeliefPlaceholder()}
        placeholderTextColor={palette.inkMuted}
        style={styles.beliefInput}
        testID="belief-system-draft"
        value={beliefStatementDraft}
      />
    </View>
  );
}

function BeliefSystemEditorStep() {
  const actor = useAppNavigationActor();
  const snapshot = useSelector(actor, _selectSnapshot);
  const saving = snapshot.matches(CHECK_IN_STATES.PERSISTING_BELIEF_STATEMENT);
  const failed = snapshot.matches(CHECK_IN_STATES.BELIEF_STATEMENT_FAILURE);
  const harmfulReady = snapshot.context.beliefStatementDraft.trim().length > 0;
  assert(snapshot.context.beliefStatementDraft.length <= MAX_BELIEF_STATEMENT_LENGTH, 'Belief draft must respect its input limit.');
  assert(snapshot.context.beliefStatements.every((statement) => statement.beliefSystemId.length > 0), 'Belief editor statements require identifiers.');

  const _beliefChanged = (statement: string) => actor.send({
    type: CHECK_IN_EVENTS.BELIEF_SYSTEM_DRAFT_CHANGED,
    statement,
  });
  const _cancel = () => actor.send({
    type: CHECK_IN_EVENTS.BELIEF_SYSTEM_EDITOR_CANCELLED,
  });
  const _save = () => actor.send({
    type: failed ? CHECK_IN_EVENTS.RETRIED : CHECK_IN_EVENTS.BELIEF_SYSTEM_EDITOR_CONFIRMED,
  });

  return (
    <View style={styles.page} testID="belief-system-editor">
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAwareScrollView
          bottomOffset={REFLECTION_KEYBOARD_BOTTOM_OFFSET}
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BeliefEditorHeader />
          <View style={styles.card}>
            <BeliefEditorFields
              beliefStatementDraft={snapshot.context.beliefStatementDraft}
              onBeliefChanged={_beliefChanged}
              saving={saving}
            />
            {failed ? (
              <Text style={styles.error}>
                <fbt desc="Error shown when a personal or guiding belief cannot be saved">
                  Your belief could not be saved.
                </fbt>
              </Text>
            ) : null}
            <View style={styles.actions}>
              <PressableScale
                accessibilityRole="button"
                disabled={saving}
                onPress={_cancel}
                style={styles.secondaryButton}
                testID="belief-system-editor-cancel"
              >
                <Text style={styles.secondaryText}>
                  <fbt desc="Button cancelling personal or guiding belief editing">Cancel</fbt>
                </Text>
              </PressableScale>
              <PressableScale
                accessibilityRole="button"
                accessibilityState={{ disabled: saving || !harmfulReady }}
                disabled={saving || !harmfulReady}
                onPress={_save}
                style={styles.primaryButton}
                testID="belief-system-editor-save"
              >
                {saving ? <ActivityIndicator color={actionColors.primaryForeground} /> : (
                  <Text style={styles.primaryText}>
                    {failed
                      ? <fbt desc="Button retrying belief persistence">Try again</fbt>
                      : <fbt desc="Button saving a personal or guiding belief">Save belief</fbt>}
                  </Text>
                )}
              </PressableScale>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}

export function ReflectionScreen() {
  const actor = useAppNavigationActor();
  const snapshot = useSelector(actor, _selectSnapshot);
  assert(snapshot.context.note.length <= MAX_NOTE_LENGTH, 'Reflection note must respect its input limit.');
  assert(snapshot.context.beliefStatementDraft.length <= MAX_BELIEF_STATEMENT_LENGTH, 'Belief draft must respect its input limit.');

  if (snapshot.matches(NAVIGATION_STATES.TABS)) return null;
  if (snapshot.matches(CHECK_IN_STATES.BELIEF_SYSTEM_CATALOG)) {
    return <BeliefSystemCatalogStep />;
  }
  if (
    snapshot.matches(CHECK_IN_STATES.BELIEF_SYSTEM_EDITOR)
    || snapshot.matches(CHECK_IN_STATES.PERSISTING_BELIEF_STATEMENT)
    || snapshot.matches(CHECK_IN_STATES.BELIEF_STATEMENT_FAILURE)
  ) {
    return <BeliefSystemEditorStep />;
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
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: 22,
    paddingBottom: 32,
  },
  flowContent: { paddingTop: 8 },
  reflectionHeading: { gap: 0 },
  momentMetadataRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
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
  selectionPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: palette.selectionWash,
    borderCurve: 'continuous',
    borderRadius: 999,
    flexDirection: 'row',
    minHeight: 34,
    paddingHorizontal: 12,
  },
  selectionPillText: { color: palette.ink, fontFamily: type.medium, fontSize: 12 },
  momentTimePill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: palette.paperRaised,
    borderColor: palette.hairline,
    borderCurve: 'continuous',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    maxWidth: '100%',
    minHeight: 34,
    paddingHorizontal: 11,
  },
  momentTimeIcon: { color: palette.inkMuted, fontFamily: type.medium, fontSize: 14 },
  momentTimeText: {
    color: palette.ink,
    flexShrink: 1,
    fontFamily: type.medium,
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 7,
  },
  momentTimeDisclosure: {
    color: palette.inkMuted,
    fontFamily: type.medium,
    fontSize: 18,
    marginLeft: 7,
  },
  momentTimeModalBackdrop: {
    alignItems: 'center',
    backgroundColor: overlayColors.dialog,
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  momentTimeModalDismissArea: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  momentTimeModalCard: {
    backgroundColor: palette.paperRaised,
    borderColor: palette.hairline,
    borderCurve: 'continuous',
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 420,
    padding: 22,
    width: '100%',
  },
  momentTimeModalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  momentTimeModalHeading: { flex: 1 },
  momentTimeModalTitle: { color: palette.ink, fontFamily: type.semibold, fontSize: 20 },
  momentTimeModalValue: {
    color: palette.inkMuted,
    fontFamily: type.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  momentTimePickerSection: {
    borderColor: palette.hairline,
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 20,
  },
  momentTimeIosControls: { gap: 10 },
  momentTimeIosControl: {
    alignItems: 'center',
    backgroundColor: surfaceColors.field,
    borderCurve: 'continuous',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 16,
  },
  momentTimeIosLabel: { color: palette.ink, fontFamily: type.medium, fontSize: 14 },
  momentTimeIosPicker: { width: 160 },
  momentTimeAndroidControls: { gap: 10 },
  momentTimeAndroidButton: {
    backgroundColor: surfaceColors.field,
    borderCurve: 'continuous',
    borderRadius: 14,
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  momentTimeAndroidLabel: { color: palette.inkMuted, fontFamily: type.medium, fontSize: 11 },
  momentTimeAndroidValue: { color: palette.ink, fontFamily: type.medium, fontSize: 14, marginTop: 3 },
  momentTimeReset: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 44,
  },
  momentTimeResetText: { color: palette.moss, fontFamily: type.semibold, fontSize: 14 },
  momentTimeModalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  momentTimeCancel: {
    alignItems: 'center',
    borderColor: palette.hairline,
    borderCurve: 'continuous',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 12,
  },
  momentTimeCancelText: { color: palette.ink, fontFamily: type.semibold, fontSize: 14 },
  momentTimeConfirm: {
    alignItems: 'center',
    backgroundColor: actionColors.primaryBackground,
    borderCurve: 'continuous',
    borderRadius: 14,
    flex: 1.4,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  momentTimeConfirmText: {
    color: actionColors.primaryForeground,
    fontFamily: type.semibold,
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    marginTop: 28,
    padding: 20,
    borderRadius: 26,
    backgroundColor: palette.paperRaised,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  reflectionEditor: {
    backgroundColor: palette.paperRaised,
    borderColor: palette.hairline,
    borderCurve: 'continuous',
    borderRadius: 24,
    borderWidth: 1,
  },
  noteLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  noteLabel: {
    color: palette.inkMuted,
    fontFamily: type.semibold,
    fontSize: 10,
    letterSpacing: 1.05,
  },
  noteOptionality: {
    color: palette.inkMuted,
    fontFamily: type.medium,
    fontSize: 9,
    letterSpacing: 0.65,
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
    backgroundColor: surfaceColors.field,
    borderColor: palette.hairline,
    borderCurve: 'continuous',
    borderWidth: 1,
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
  suggestionSelected: {
    borderColor: palette.moss,
    backgroundColor: palette.selectionWash,
  },
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
  guidingButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: palette.moss,
    backgroundColor: palette.selectionWash,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  createBeliefButtonSpacing: { marginTop: 22 },
  browseCopy: { flex: 1 },
  browseTitle: { fontFamily: type.semibold, color: palette.ink, fontSize: 14 },
  browseHelp: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 12, marginTop: 2 },
  guidingPreview: {
    fontFamily: type.regular,
    color: palette.moss,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  chevron: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 28, lineHeight: 30 },
  catalogBack: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: 10,
  },
  catalogList: { gap: 8, paddingTop: 24 },
  editorField: { gap: 8, paddingBottom: 18 },
  editorLabel: {
    fontFamily: type.semibold,
    color: palette.inkMuted,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  beliefInput: {
    minHeight: 112,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: surfaceColors.belief,
    padding: 16,
    fontFamily: type.regular,
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  sourceBelief: {
    gap: 8,
    marginBottom: 18,
    padding: 16,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: surfaceColors.belief,
  },
  sourceBeliefText: {
    fontFamily: type.medium,
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
  },
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
  nextStep: {
    borderTopColor: palette.hairline,
    borderTopWidth: 1,
    gap: 4,
    marginTop: 16,
    paddingTop: 14,
  },
  nextStepLabel: {
    color: palette.moss,
    fontFamily: type.semibold,
    fontSize: 9,
    letterSpacing: 1,
  },
  nextStepCopy: { color: palette.inkMuted, fontFamily: type.regular, fontSize: 12, lineHeight: 18 },
  primaryButton: {
    minHeight: 50,
    backgroundColor: actionColors.primaryBackground,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  standalonePrimaryButton: { marginTop: 14 },
  primaryText: { fontFamily: type.semibold, color: actionColors.primaryForeground, fontSize: 14 },
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
  saveForNowButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveForNowText: {
    fontFamily: type.medium,
    color: palette.inkMuted,
    fontSize: 13,
  },
});
