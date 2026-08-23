import { useSelector } from '@xstate/react';
import { fbs } from 'fbtee';
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
import assert from '@/assert';

import { AppBackButton } from '@/components/ui/app-back-button';
import {
  BELIEF_LIBRARY_EVENTS,
  BELIEF_LIBRARY_STATES,
  MAX_BELIEF_STATEMENT_LENGTH,
  REFLECTION_KEYBOARD_BOTTOM_OFFSET,
  REMINDER_EVENTS,
  REMINDER_NOTIFICATION_CONTENT,
  REMINDER_TARGET_KINDS,
} from '@/constants';
import {
  beliefStatementForId,
  type BeliefStatement,
} from '@/features/check-in/domain/belief-statement';
import {
  beliefSystemText,
  guidingBeliefPlaceholder,
} from '@/features/check-in/ui/belief-system-copy';
import {
  GuidingBeliefCardLabel,
  HarmfulBeliefCardLabel,
} from '@/features/check-in/ui/belief-card-label';
import { GuidingBeliefWritingHelp } from '@/features/check-in/ui/guiding-belief-writing-help';
import { PersonalBeliefCreateButton } from '@/features/check-in/ui/personal-belief-create-button';
import { actionColors, palette, surfaceColors, type } from '@/theme';
import type {
  GuidingBeliefReminderAssignment,
  ReminderAssignment,
} from '@/features/reminders/domain/reminder-assignment';
import { confirmReminderDeletion } from '@/features/reminders/ui/reminder-deletion';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { confirmBeliefRemoval } from './belief-library-removal';
import { guidingBeliefLibraryStatements } from '../domain/guiding-belief-library';

const selectSnapshot = (
  snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>,
) => snapshot;

function guidingBeliefReminderForStatement({
  assignments,
  beliefSystemId,
}: {
  assignments: readonly ReminderAssignment[];
  beliefSystemId: BeliefStatement['beliefSystemId'];
}): GuidingBeliefReminderAssignment | undefined {
  return assignments.find(
    (assignment): assignment is GuidingBeliefReminderAssignment => (
      assignment.targetKind === REMINDER_TARGET_KINDS.GUIDING_BELIEF
      && assignment.beliefSystemId === beliefSystemId
    ),
  );
}

function LibraryBackButton() {
  const actor = useAppNavigationActor();
  const snapshot = actor.getSnapshot();
  assert(new Set(snapshot.context.beliefStatements.map(({ beliefSystemId }) => beliefSystemId)).size === snapshot.context.beliefStatements.length, 'Belief library ids must be unique');
  assert(new Set(snapshot.context.reminderAssignments.map(({ id }) => id)).size === snapshot.context.reminderAssignments.length, 'Reminder assignment ids must be unique');
  const close = () => actor.send({ type: BELIEF_LIBRARY_EVENTS.CLOSED });

  return (
    <AppBackButton
      onPress={close}
      style={styles.backButton}
      testID="belief-library-close"
    />
  );
}

function reminderStatusLabel(reminder: GuidingBeliefReminderAssignment | undefined) {
  if (!reminder) return <fbt desc="Missing Leitsatz reminder status">Not set</fbt>;
  return reminder.enabled
    ? <fbt desc="Active Leitsatz reminder status">Active</fbt>
    : <fbt desc="Disabled Leitsatz reminder status">Off</fbt>;
}

function reminderContentLabel(reminder: GuidingBeliefReminderAssignment) {
  return reminder.notificationContent === REMINDER_NOTIFICATION_CONTENT.LEITSATZ
    ? <fbt desc="Leitsatz visible notification content status">Shows this Leitsatz in the notification</fbt>
    : <fbt desc="General notification content status">Uses a general notification message</fbt>;
}

function BeliefLibraryReminderActions({
  disabled,
  reminder,
  statement,
}: {
  disabled: boolean;
  reminder: GuidingBeliefReminderAssignment | undefined;
  statement: BeliefStatement;
}) {
  assert(statement.beliefSystemId.length > 0, 'Reminder actions require a belief id');
  assert(reminder === undefined || reminder.beliefSystemId === statement.beliefSystemId, 'Reminder actions must belong to the displayed belief');
  const actor = useAppNavigationActor();
  const editReminder = () => actor.send(reminder
    ? {
        type: REMINDER_EVENTS.ASSIGNMENT_EDIT_REQUESTED,
        assignmentId: reminder.id,
      }
    : {
        type: REMINDER_EVENTS.TARGET_SELECTED,
        beliefSystemId: statement.beliefSystemId,
      });
  const toggleReminder = () => {
    if (!reminder) return;
    actor.send({
      type: REMINDER_EVENTS.ASSIGNMENT_TOGGLED,
      assignmentId: reminder.id,
    });
  };
  const deleteReminder = () => {
    if (!reminder) return;
    actor.send({
      type: REMINDER_EVENTS.ASSIGNMENT_DELETE_REQUESTED,
      assignmentId: reminder.id,
    });
  };
  const confirmDeleteReminder = () => confirmReminderDeletion(deleteReminder);

  return (
    <View style={styles.reminderActions}>
      <PressableScale
        accessibilityRole="button"
        disabled={disabled}
        onPress={editReminder}
        style={styles.reminderAction}
        testID={`belief-reminder-edit-${statement.beliefSystemId}`}
      >
        <Text style={styles.reminderActionText}>
          {reminder
            ? <fbt desc="Edit Leitsatz reminder button">Edit reminder</fbt>
            : <fbt desc="Create Leitsatz reminder button">Add reminder</fbt>}
        </Text>
      </PressableScale>
      {reminder ? (
        <PressableScale
          accessibilityRole="button"
          disabled={disabled}
          onPress={toggleReminder}
          style={styles.reminderAction}
          testID={`belief-reminder-toggle-${statement.beliefSystemId}`}
        >
          <Text style={styles.reminderActionText}>
            {reminder.enabled
              ? <fbt desc="Disable Leitsatz reminder button">Turn off</fbt>
              : <fbt desc="Enable Leitsatz reminder button">Turn on</fbt>}
          </Text>
        </PressableScale>
      ) : null}
      {reminder ? (
        <PressableScale
          accessibilityRole="button"
          disabled={disabled}
          onPress={confirmDeleteReminder}
          style={styles.reminderAction}
          testID={`belief-reminder-delete-${statement.beliefSystemId}`}
        >
          <Text style={styles.reminderDeleteText}>
            <fbt desc="Delete Leitsatz reminder button">Remove</fbt>
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

function BeliefLibraryReminderSection({
  disabled,
  reminder,
  statement,
}: {
  disabled: boolean;
  reminder: GuidingBeliefReminderAssignment | undefined;
  statement: BeliefStatement;
}) {
  return (
    <View style={styles.reminderCard}>
      <View style={styles.reminderHeader}>
        <Text style={styles.reminderLabel}>
          <fbt desc="Leitsatz reminder label in Leitsatz management">GENTLE REMINDER</fbt>
        </Text>
        <Text style={styles.reminderStatus}>{reminderStatusLabel(reminder)}</Text>
      </View>
      <Text style={styles.reminderCopy}>
        {reminder
          ? reminderContentLabel(reminder)
          : (
              <fbt desc="Explanation that a Leitsatz reminder sends a notification">
                Choose days and times, and this guiding belief returns as a gentle notification.
              </fbt>
            )}
      </Text>
      <BeliefLibraryReminderActions disabled={disabled} reminder={reminder} statement={statement} />
    </View>
  );
}

function BeliefLibraryStatementHeader({ statement }: { statement: BeliefStatement }) {
  assert(statement.beliefSystemId.length > 0, 'Belief header requires an id');
  const limitingBelief = beliefSystemText({
    id: statement.beliefSystemId,
    statements: [statement],
  });
  assert(limitingBelief.trim().length > 0, 'Belief header requires limiting copy');

  if (statement.guidingStatement === undefined) {
    return (
      <View>
        <Text style={styles.statementLabel}>
          <fbt desc="Label above a personal restrictive core belief in settings">
            CORE BELIEF · LIMITING
          </fbt>
        </Text>
        <Text style={styles.guidingStatement}>{limitingBelief}</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.guidingLabel}>
        <fbt desc="Label above a personal positive guiding belief in settings">
          GUIDING BELIEF · SUPPORTIVE
        </fbt>
      </Text>
      <Text style={styles.guidingStatement}>{statement.guidingStatement}</Text>
      <View style={styles.limitingRow}>
        <Text style={styles.limitingLabel}>
          <fbt desc="Label above a personal restrictive core belief in settings">
            CORE BELIEF · LIMITING
          </fbt>
        </Text>
        <Text style={styles.limitingStatement}>{limitingBelief}</Text>
      </View>
    </View>
  );
}

function BeliefLibraryRowActions({
  disabled,
  statement,
}: {
  disabled: boolean;
  statement: BeliefStatement;
}) {
  const actor = useAppNavigationActor();
  assert(statement.beliefSystemId.length > 0, 'Belief actions require an id');
  assert(statement.kind === 'built-in' || statement.harmfulStatement.trim().length > 0, 'Custom belief actions require limiting copy');
  if (statement.kind !== 'custom') return null;
  const edit = () => actor.send({
    type: BELIEF_LIBRARY_EVENTS.EDIT_REQUESTED,
    beliefSystemId: statement.beliefSystemId,
  });
  const remove = () => actor.send({
    type: BELIEF_LIBRARY_EVENTS.REMOVE_REQUESTED,
    beliefSystemId: statement.beliefSystemId,
  });
  const confirmRemove = () => confirmBeliefRemoval(remove);

  return (
    <View style={styles.rowActions}>
      <PressableScale
        accessibilityRole="button"
        disabled={disabled}
        onPress={edit}
        style={styles.editButton}
        testID={`edit-custom-belief-${statement.beliefSystemId}`}
      >
        <Text style={styles.editText}>
          <fbt desc="Button editing a personal core belief">Edit</fbt>
        </Text>
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        disabled={disabled}
        onPress={confirmRemove}
        style={styles.removeButton}
        testID={`remove-custom-belief-${statement.beliefSystemId}`}
      >
        <Text style={styles.removeText}>
          <fbt desc="Button removing a personal core belief">Remove</fbt>
        </Text>
      </PressableScale>
    </View>
  );
}

function BeliefLibraryRow({
  disabled,
  reminder,
  statement,
}: {
  disabled: boolean;
  reminder: GuidingBeliefReminderAssignment | undefined;
  statement: BeliefStatement;
}) {
  return (
    <View style={styles.beliefCard} testID={`belief-library-row-${statement.beliefSystemId}`}>
      <BeliefLibraryStatementHeader statement={statement} />
      <BeliefLibraryReminderSection disabled={disabled} reminder={reminder} statement={statement} />
      <BeliefLibraryRowActions disabled={disabled} statement={statement} />
    </View>
  );
}

function BeliefLibraryList() {
  const actor = useAppNavigationActor();
  const snapshot = useSelector(actor, selectSnapshot);
  const statements = guidingBeliefLibraryStatements({
    assignments: snapshot.context.reminderAssignments,
    statements: snapshot.context.beliefStatements,
  });
  const retiring = snapshot.matches(BELIEF_LIBRARY_STATES.RETIRING);
  assert(statements.length <= snapshot.context.beliefStatements.length, 'Library filtering cannot add belief statements');
  assert(statements.every((statement) => snapshot.context.beliefStatements.includes(statement)), 'Library rows must come from stored beliefs');
  const create = () => actor.send({ type: BELIEF_LIBRARY_EVENTS.CREATE_REQUESTED });

  return (
    <View style={styles.page} testID="belief-library-screen">
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator
          testID="belief-library-scroll"
        >
          <LibraryBackButton />
          <Text style={styles.eyebrow}>
            <fbt desc="Eyebrow above guiding-belief management">YOUR GUIDING BELIEFS</fbt>
          </Text>
          <Text style={styles.title}>
            <fbt desc="Title of guiding-belief management">What supports you.</fbt>
          </Text>
          <Text style={styles.copy}>
            <fbt desc="Explanation of guiding-belief management including suggested beliefs">
              Manage the gentle reminder for each guiding belief. Beliefs you wrote yourself can also be edited or removed.
            </fbt>
          </Text>
          {snapshot.context.error ? (
            <Text style={styles.error}>
              <fbt desc="Error shown when a personal core-belief management action fails">
                Your change could not be saved.
              </fbt>
            </Text>
          ) : null}
          <PersonalBeliefCreateButton
            disabled={retiring}
            onPress={create}
            style={styles.createButtonSpacing}
            testID="belief-library-create"
          />
          {statements.length === 0 ? (
            <View style={styles.emptyCard} testID="belief-library-empty">
              <Text style={styles.emptyTitle}>
                <fbt desc="Title shown when no guiding beliefs exist">
                  No guiding beliefs yet.
                </fbt>
              </Text>
              <Text style={styles.emptyCopy}>
                <fbt desc="Explanation shown when no guiding beliefs exist">
                  Add one here, or during the optional belief step of a check-in.
                </fbt>
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {statements.map((statement) => (
                <BeliefLibraryRow
                  disabled={retiring}
                  key={statement.beliefSystemId}
                  reminder={guidingBeliefReminderForStatement({
                    assignments: snapshot.context.reminderAssignments,
                    beliefSystemId: statement.beliefSystemId,
                  })}
                  statement={statement}
                />
              ))}
            </View>
          )}
          {retiring ? <ActivityIndicator color={palette.moss} /> : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function BeliefLibraryEditor() {
  const actor = useAppNavigationActor();
  const snapshot = useSelector(actor, selectSnapshot);
  const saving = snapshot.matches(BELIEF_LIBRARY_STATES.SAVING);
  const editingStatement = snapshot.context.beliefLibraryStatementId
    ? beliefStatementForId({
        beliefSystemId: snapshot.context.beliefLibraryStatementId,
        statements: snapshot.context.beliefStatements,
      })
    : undefined;
  const creating = editingStatement === undefined;
  const harmfulReady = snapshot.context.beliefLibraryHarmfulDraft.trim().length > 0;
  assert(snapshot.context.beliefLibraryHarmfulDraft.length <= MAX_BELIEF_STATEMENT_LENGTH, 'Limiting draft must respect its maximum length');
  assert(snapshot.context.beliefLibraryGuidingDraft.length <= MAX_BELIEF_STATEMENT_LENGTH, 'Guiding draft must respect its maximum length');
  const cancel = () => actor.send({ type: BELIEF_LIBRARY_EVENTS.EDIT_CANCELLED });
  const harmfulChanged = (statement: string) => actor.send({
    type: BELIEF_LIBRARY_EVENTS.HARMFUL_DRAFT_CHANGED,
    statement,
  });
  const guidingChanged = (statement: string) => actor.send({
    type: BELIEF_LIBRARY_EVENTS.GUIDING_DRAFT_CHANGED,
    statement,
  });
  const toggleGuidingHelp = () => actor.send({
    type: BELIEF_LIBRARY_EVENTS.GUIDING_HELP_TOGGLED,
  });
  const save = () => actor.send({ type: BELIEF_LIBRARY_EVENTS.SAVE_REQUESTED });
  return (
    <View style={styles.page} testID="belief-library-editor">
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAwareScrollView
          bottomOffset={REFLECTION_KEYBOARD_BOTTOM_OFFSET}
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <AppBackButton
            disabled={saving}
            onPress={cancel}
            style={styles.backButton}
            testID="belief-library-editor-cancel"
          />
          <Text style={styles.eyebrow}>
            {creating ? (
              <fbt desc="Eyebrow above personal core-belief creation in settings">
                ADD CORE BELIEF
              </fbt>
            ) : (
              <fbt desc="Eyebrow above personal core-belief editing">EDIT CORE BELIEF</fbt>
            )}
          </Text>
          <Text style={styles.title}>
            {creating ? (
              <fbt desc="Title of personal core-belief creation in settings">
                Name the belief.
              </fbt>
            ) : (
              <fbt desc="Title of personal core-belief editing">Keep it true to you.</fbt>
            )}
          </Text>
          <Text style={styles.copy}>
            {creating ? (
              <fbt desc="Explanation of personal core-belief creation with optional guiding belief">
                Write the inner rule that feels limiting. A supportive guiding belief is optional.
              </fbt>
            ) : (
              <fbt desc="Explanation that editing a shared personal belief updates earlier moments">
                Changes also appear in your earlier moments because they share this belief.
              </fbt>
            )}
          </Text>
          <View style={styles.editorCard} testID="belief-library-harmful-card">
            <HarmfulBeliefCardLabel />
            <TextInput
              accessibilityLabel={String(fbs(
                'Personal core belief',
                'Accessibility label for personal harmful core-belief editing',
              ))}
              editable={!saving}
              maxLength={MAX_BELIEF_STATEMENT_LENGTH}
              multiline
              onChangeText={harmfulChanged}
              style={styles.input}
              testID="belief-library-harmful-draft"
              value={snapshot.context.beliefLibraryHarmfulDraft}
            />
          </View>
          <View style={styles.editorCard} testID="belief-library-guiding-card">
            <GuidingBeliefCardLabel />
            <TextInput
              accessibilityLabel={String(fbs(
                'Personal guiding belief',
                'Accessibility label for personal positive guiding-belief editing',
              ))}
              editable={!saving}
              maxLength={MAX_BELIEF_STATEMENT_LENGTH}
              multiline
              onChangeText={guidingChanged}
              placeholder={guidingBeliefPlaceholder()}
              placeholderTextColor={palette.inkMuted}
              style={styles.input}
              testID="belief-library-guiding-draft"
              value={snapshot.context.beliefLibraryGuidingDraft}
            />
            <GuidingBeliefWritingHelp
              contentTestID="belief-library-guiding-help"
              disabled={saving}
              expanded={snapshot.context.guidingHelpVisible}
              onToggle={toggleGuidingHelp}
              toggleTestID="belief-library-guiding-help-toggle"
            />
          </View>
          {snapshot.context.error ? (
            <Text style={styles.error}>
              <fbt desc="Error shown when personal core-belief editing cannot be saved">
                Your change could not be saved.
              </fbt>
            </Text>
          ) : null}
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ disabled: saving || !harmfulReady }}
            disabled={saving || !harmfulReady}
            onPress={save}
            style={[styles.saveButton, !harmfulReady && styles.saveButtonDisabled]}
            testID="belief-library-save"
          >
            {saving ? <ActivityIndicator color={actionColors.primaryForeground} /> : (
              <Text style={styles.saveText}>
                {creating ? (
                  <fbt desc="Button saving a new personal core belief from settings">
                    Add core belief
                  </fbt>
                ) : (
                  <fbt desc="Button saving changes to a personal core belief">Save changes</fbt>
                )}
              </Text>
            )}
          </PressableScale>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}

export function BeliefLibraryScreen() {
  const actor = useAppNavigationActor();
  const editing = useSelector(actor, (snapshot) => (
    snapshot.matches(BELIEF_LIBRARY_STATES.EDITOR)
    || snapshot.matches(BELIEF_LIBRARY_STATES.SAVING)
  ));
  const snapshot = actor.getSnapshot();
  assert(new Set(snapshot.context.beliefStatements.map(({ beliefSystemId }) => beliefSystemId)).size === snapshot.context.beliefStatements.length, 'Belief library ids must be unique');
  assert(new Set(snapshot.context.reminderAssignments.map(({ id }) => id)).size === snapshot.context.reminderAssignments.length, 'Reminder assignment ids must be unique');

  return editing ? <BeliefLibraryEditor /> : <BeliefLibraryList />;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  safeArea: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: 22,
    paddingBottom: 48,
  },
  backButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  eyebrow: {
    fontFamily: type.semibold,
    color: palette.inkMuted,
    fontSize: 11,
    letterSpacing: 1.4,
    marginTop: 12,
  },
  title: { fontFamily: type.semibold, color: palette.ink, fontSize: 34, marginTop: 8 },
  copy: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 24,
  },
  list: { gap: 14 },
  createButtonSpacing: { marginBottom: 16 },
  beliefCard: {
    backgroundColor: palette.paperRaised,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 20,
  },
  statementLabel: {
    fontFamily: type.semibold,
    color: palette.inkMuted,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  guidingLabel: {
    fontFamily: type.semibold,
    color: palette.moss,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  guidingStatement: {
    fontFamily: type.medium,
    color: palette.ink,
    fontSize: 22,
    lineHeight: 30,
    marginTop: 7,
  },
  limitingRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
  },
  limitingLabel: {
    fontFamily: type.semibold,
    color: palette.inkMuted,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  limitingStatement: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 4,
  },
  reminderCard: {
    backgroundColor: palette.selectionWash,
    borderRadius: 18,
    borderCurve: 'continuous',
    padding: 14,
    marginTop: 16,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  reminderLabel: {
    fontFamily: type.semibold,
    color: palette.inkMuted,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  reminderStatus: { fontFamily: type.semibold, color: palette.moss, fontSize: 13 },
  reminderCopy: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  reminderActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  reminderAction: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingHorizontal: 12,
  },
  reminderActionText: { fontFamily: type.semibold, color: palette.ink, fontSize: 13 },
  reminderDeleteText: { fontFamily: type.semibold, color: palette.danger, fontSize: 13 },
  rowActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  editButton: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: actionColors.primaryBackground,
  },
  editText: { fontFamily: type.semibold, color: actionColors.primaryForeground, fontSize: 14 },
  removeButton: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  removeText: { fontFamily: type.semibold, color: palette.danger, fontSize: 14 },
  emptyCard: {
    backgroundColor: palette.paperRaised,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 20,
  },
  emptyTitle: { fontFamily: type.medium, color: palette.ink, fontSize: 20 },
  emptyCopy: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  error: {
    fontFamily: type.regular,
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  editorCard: {
    backgroundColor: palette.paperRaised,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 20,
    gap: 10,
    marginBottom: 16,
  },
  input: {
    minHeight: 112,
    borderRadius: 18,
    backgroundColor: surfaceColors.input,
    padding: 16,
    fontFamily: type.medium,
    color: palette.ink,
    fontSize: 17,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  saveButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: actionColors.primaryBackground,
  },
  saveButtonDisabled: { opacity: 0.45 },
  saveText: { fontFamily: type.semibold, color: actionColors.primaryForeground, fontSize: 15 },
});
