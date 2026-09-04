import { useSelector } from '@xstate/react';
import { PressableScale } from 'pressto';
import {
  ActivityIndicator,
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
  CHECK_IN_EVENTS,
  CHECK_IN_STATES,
  MAX_BELIEF_STATEMENT_LENGTH,
  REFLECTION_KEYBOARD_BOTTOM_OFFSET,
} from '@/constants';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import {
  beliefStatementForId,
  isCustomBeliefSystemId,
} from '@/features/beliefs/domain/belief-statement';
import {
  beliefSystemText,
  customBeliefAccessibilityLabel,
  guidingBeliefAccessibilityLabel,
  guidingBeliefPlaceholder,
} from '@/features/beliefs/ui/belief-system-copy';
import {
  GuidingBeliefCardLabel,
  HarmfulBeliefCardLabel,
} from '@/features/beliefs/ui/belief-card-label';
import { CheckInProgressHeader } from './check-in-progress';
import { GuidingBeliefWritingHelp } from '@/features/beliefs/ui/guiding-belief-writing-help';
import { actionColors, borderColors, palette, surfaceColors, type } from '@/theme';

type NavigationSnapshot = ReturnType<
  ReturnType<typeof useAppNavigationActor>['getSnapshot']
>;

const _selectSnapshot = (snapshot: NavigationSnapshot) => snapshot;

function GuidingBeliefFinishLabel({
  canSave,
  failed,
}: {
  canSave: boolean;
  failed: boolean;
}) {
  assert(MAX_BELIEF_STATEMENT_LENGTH > 0, 'Guiding belief input limit must be positive.');
  assert(REFLECTION_KEYBOARD_BOTTOM_OFFSET >= 0, 'Guiding belief keyboard offset must not be negative.');
  if (failed) {
    return (
      <Text style={styles.primaryText}>
        <fbt desc="Button retrying positive guiding belief persistence">Try again</fbt>
      </Text>
    );
  }
  if (canSave) {
    return (
      <Text style={styles.primaryText}>
        <fbt desc="Button saving a positive guiding belief and completing the flow">
          Save and finish
        </fbt>
      </Text>
    );
  }
  return (
    <Text style={styles.primaryText}>
      <fbt desc="Button completing an optional guiding belief step without entering one">
        Finish without a guiding belief
      </fbt>
    </Text>
  );
}

function guidingBeliefViewModel(snapshot: NavigationSnapshot) {
  const beliefSystemId = snapshot.context.beliefSystemId;
  const statements = snapshot.context.beliefStatements;
  assert(statements.every((item) => item.beliefSystemId.length > 0), 'Guiding belief statements require identifiers.');
  assert(snapshot.context.guidingBeliefStatementDraft.length <= MAX_BELIEF_STATEMENT_LENGTH, 'Guiding belief draft must respect its input limit.');
  const statement = beliefSystemId
    ? beliefStatementForId({ beliefSystemId, statements })
    : undefined;
  const custom = beliefSystemId
    ? isCustomBeliefSystemId(beliefSystemId)
    : false;
  const saving = snapshot.matches(CHECK_IN_STATES.PERSISTING_GUIDING_BELIEF);
  const failed = snapshot.matches(CHECK_IN_STATES.GUIDING_BELIEF_FAILURE);
  const guidingReady = snapshot.context.guidingBeliefStatementDraft.trim().length > 0;
  const hasSavedGuidingBelief = statement?.guidingStatement !== undefined;
  const harmfulReady = !custom || snapshot.context.beliefStatementDraft.trim().length > 0;
  const customTextChanged = statement?.kind === 'custom'
    && snapshot.context.beliefStatementDraft.trim() !== statement.harmfulStatement;
  const canSave = harmfulReady
    && (guidingReady || statement?.guidingStatement !== undefined || customTextChanged);
  const selectedText = beliefSystemId
    ? beliefSystemText({ id: beliefSystemId, statements })
    : '';
  return {
    beliefSystemId,
    canSave,
    custom,
    failed,
    guidingReady,
    hasSavedGuidingBelief,
    saving,
    selectedText,
    statement,
  };
}

export function GuidingBeliefScreen() {
  const actor = useAppNavigationActor();
  const snapshot = useSelector(actor, _selectSnapshot);
  const {
    beliefSystemId,
    canSave,
    custom,
    failed,
    guidingReady,
    hasSavedGuidingBelief,
    saving,
    selectedText,
    statement,
  } = guidingBeliefViewModel(snapshot);
  assert(snapshot.context.beliefStatementDraft.length <= MAX_BELIEF_STATEMENT_LENGTH, 'Core belief draft must respect its input limit.');
  assert(snapshot.context.guidingBeliefStatementDraft.length <= MAX_BELIEF_STATEMENT_LENGTH, 'Guiding belief draft must respect its input limit.');

  const _back = () => actor.send({
    type: CHECK_IN_EVENTS.GUIDING_BELIEF_BACK_REQUESTED,
  });
  const _beliefChanged = (harmfulStatement: string) => actor.send({
    type: CHECK_IN_EVENTS.BELIEF_SYSTEM_DRAFT_CHANGED,
    statement: harmfulStatement,
  });
  const _guidingChanged = (guidingStatement: string) => actor.send({
    type: CHECK_IN_EVENTS.GUIDING_BELIEF_SYSTEM_DRAFT_CHANGED,
    statement: guidingStatement,
  });
  const _toggleHelp = () => actor.send({
    type: CHECK_IN_EVENTS.GUIDING_BELIEF_HELP_TOGGLED,
  });
  const _finish = () => {
    if (failed) {
      actor.send({ type: CHECK_IN_EVENTS.RETRIED });
      return;
    }
    if (canSave) {
      actor.send({ type: CHECK_IN_EVENTS.GUIDING_BELIEF_CONFIRMED });
      return;
    }
    actor.send({ type: CHECK_IN_EVENTS.GUIDING_BELIEF_SKIPPED });
  };
  if (!beliefSystemId) return null;

  return (
    <View style={styles.page} testID="guiding-belief-screen">
      <SafeAreaView style={styles.safeArea}>
        <CheckInProgressHeader
          activeStep={3}
          context="guiding-belief"
        />
        <KeyboardAwareScrollView
          bottomOffset={REFLECTION_KEYBOARD_BOTTOM_OFFSET}
          contentContainerStyle={[styles.content, styles.flowContent]}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          style={styles.scroll}
          testID="guiding-belief-scroll"
        >
          <View style={styles.header}>
            <AppBackButton
              disabled={saving}
              onPress={_back}
              style={styles.backButton}
              testID="guiding-belief-back"
            />
            <Text style={styles.title}>
              <fbt desc="Title for the dedicated positive guiding belief page">
                What would support you instead?
              </fbt>
            </Text>
            <Text style={styles.copy}>
              <fbt desc="Contrast between restrictive core beliefs and supportive guiding beliefs">
                Your core belief describes what limits you. Your guiding belief offers a more supportive direction.
              </fbt>
            </Text>
          </View>
          <View style={styles.card}>
            <HarmfulBeliefCardLabel />
            {custom ? (
              <TextInput
                accessibilityLabel={customBeliefAccessibilityLabel()}
                editable={!saving}
                maxLength={MAX_BELIEF_STATEMENT_LENGTH}
                multiline
                onChangeText={_beliefChanged}
                placeholderTextColor={palette.inkMuted}
                style={styles.sourceInput}
                testID="guiding-source-belief-draft"
                value={snapshot.context.beliefStatementDraft}
              />
            ) : (
              <Text style={styles.sourceText} testID="guiding-source-belief">
                {selectedText}
              </Text>
            )}
          </View>
          <View style={styles.card}>
            <GuidingBeliefCardLabel />
            {hasSavedGuidingBelief ? (
              <View style={styles.savedGuidingBelief} testID="saved-guiding-belief-reason">
                <Text style={styles.savedGuidingBeliefTitle}>
                  <fbt desc="Heading explaining why a guiding belief input is already filled">
                    Previously saved for this core belief
                  </fbt>
                </Text>
                <Text style={styles.savedGuidingBeliefCopy}>
                  <fbt desc="Explanation that an earlier guiding belief is reused and remains editable">
                    That is why your guiding belief is already filled in. You can keep it or change it.
                  </fbt>
                </Text>
              </View>
            ) : null}
            <TextInput
              accessibilityLabel={guidingBeliefAccessibilityLabel()}
              editable={!saving}
              maxLength={MAX_BELIEF_STATEMENT_LENGTH}
              multiline
              onChangeText={_guidingChanged}
              placeholder={guidingBeliefPlaceholder()}
              placeholderTextColor={palette.inkMuted}
              style={styles.guidingInput}
              testID="guiding-belief-draft"
              value={snapshot.context.guidingBeliefStatementDraft}
            />
            <GuidingBeliefWritingHelp
              contentTestID="guiding-belief-help"
              disabled={saving}
              expanded={snapshot.context.guidingHelpVisible}
              onToggle={_toggleHelp}
              toggleTestID="guiding-belief-help-toggle"
            />
            {statement?.guidingStatement && !guidingReady ? (
              <Text style={styles.removeHint}>
                <fbt desc="Hint explaining that saving an empty guiding belief removes it">
                  Save the empty field to remove the existing guiding belief.
                </fbt>
              </Text>
            ) : null}
            {failed ? (
              <Text style={styles.error}>
                <fbt desc="Error shown when a positive guiding belief cannot be saved">
                  Your guiding belief could not be saved.
                </fbt>
              </Text>
            ) : null}
          </View>
          <View style={styles.actions}>
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={_finish}
              style={styles.primaryButton}
              testID="guiding-belief-finish"
            >
              {saving
                ? <ActivityIndicator color={actionColors.primaryForeground} />
                : <GuidingBeliefFinishLabel canSave={canSave} failed={failed} />}
            </PressableScale>
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
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
    paddingBottom: 36,
    gap: 16,
  },
  flowContent: { paddingTop: 16 },
  backButton: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  header: { gap: 10 },
  title: {
    fontFamily: type.semibold,
    color: palette.ink,
    fontSize: 34,
    lineHeight: 40,
  },
  copy: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: palette.paperRaised,
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 20,
    gap: 10,
  },
  sourceText: {
    fontFamily: type.medium,
    color: palette.ink,
    fontSize: 18,
    lineHeight: 26,
  },
  sourceInput: {
    minHeight: 92,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: palette.paper,
    color: palette.ink,
    fontFamily: type.medium,
    fontSize: 17,
    lineHeight: 25,
    padding: 16,
    textAlignVertical: 'top',
  },
  guidingInput: {
    minHeight: 120,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: borderColors.moss20,
    backgroundColor: palette.selectionWash,
    color: palette.ink,
    fontFamily: type.medium,
    fontSize: 17,
    lineHeight: 25,
    padding: 16,
    textAlignVertical: 'top',
  },
  savedGuidingBelief: {
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: surfaceColors.subtle,
    padding: 12,
    gap: 4,
  },
  savedGuidingBeliefTitle: {
    fontFamily: type.semibold,
    color: palette.inkMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  savedGuidingBeliefCopy: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  removeHint: {
    fontFamily: type.regular,
    color: palette.inkMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    fontFamily: type.medium,
    color: palette.danger,
    fontSize: 12,
    lineHeight: 18,
  },
  actions: { flexDirection: 'row' },
  primaryButton: {
    minHeight: 54,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: actionColors.primaryBackground,
    paddingHorizontal: 12,
  },
  primaryText: {
    fontFamily: type.semibold,
    color: actionColors.primaryForeground,
    fontSize: 13,
    textAlign: 'center',
  },
});
