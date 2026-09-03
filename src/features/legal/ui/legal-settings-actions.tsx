import { useMachine, useSelector } from '@xstate/react';
import { fbs } from 'fbtee';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import assert from '@/assert';
import { SettingsActionRow } from '@/components/ui/settings-action-row';
import {
  LEGAL_DOCUMENT_EVENTS,
  LEGAL_DOCUMENT_KINDS,
  LEGAL_DOCUMENT_STATES,
} from '@/constants';
import { palette, type } from '@/theme';
import { legalDocumentsMachine } from '../application/legal-documents.machine';

const _selectFailure = (
  snapshot: ReturnType<ReturnType<typeof useMachine<typeof legalDocumentsMachine>>[2]['getSnapshot']>,
) => snapshot.matches(LEGAL_DOCUMENT_STATES.FAILURE);

export function LegalSettingsActions() {
  const [, , actor] = useMachine(legalDocumentsMachine);
  const failed = useSelector(actor, _selectFailure);
  const snapshot = actor.getSnapshot();
  assert(snapshot.status !== 'stopped', 'Legal document actions require an active browser actor.');
  assert(failed === snapshot.matches(LEGAL_DOCUMENT_STATES.FAILURE), 'Legal document failure state must match the actor snapshot.');
  const _openPrivacyPolicy = () => actor.send({
    type: LEGAL_DOCUMENT_EVENTS.OPEN_REQUESTED,
    document: LEGAL_DOCUMENT_KINDS.PRIVACY_POLICY,
  });
  const _openTerms = () => actor.send({
    type: LEGAL_DOCUMENT_EVENTS.OPEN_REQUESTED,
    document: LEGAL_DOCUMENT_KINDS.TERMS_OF_USE,
  });
  const _dismissFailure = () => actor.send({ type: LEGAL_DOCUMENT_EVENTS.DISMISSED });

  return (
    <View>
      <View style={styles.actions}>
        <SettingsActionRow
          description={String(fbs(
            'Learn how Youmotion handles app and journal data.',
            'Settings privacy policy link explanation',
          ))}
          onPress={_openPrivacyPolicy}
          testID="open-privacy-policy"
          title={String(fbs('Privacy policy', 'Settings privacy policy link title'))}
        />
        <SettingsActionRow
          description={String(fbs(
            'Read the terms that apply when you use Youmotion.',
            'Settings terms of use link explanation',
          ))}
          onPress={_openTerms}
          testID="open-terms-of-use"
          title={String(fbs('Terms of use', 'Settings terms of use link title'))}
        />
      </View>
      {failed ? (
        <View accessibilityRole="alert" style={styles.failure} testID="legal-document-error">
          <Text style={styles.failureText}>
            <fbt desc="Legal document browser failure message">The page could not be opened. Please try again when you are online.</fbt>
          </Text>
          <Pressable accessibilityRole="button" onPress={_dismissFailure} testID="dismiss-legal-document-error">
            <Text style={styles.dismissText}><fbt desc="Dismiss legal document browser failure">Dismiss</fbt></Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.hairline,
    marginBottom: 26,
  },
  failure: {
    backgroundColor: palette.selectionWash,
    borderRadius: 16,
    borderCurve: 'continuous',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 26,
    padding: 14,
  },
  failureText: { flex: 1, color: palette.ink, fontFamily: type.regular, fontSize: 13, lineHeight: 19 },
  dismissText: { color: palette.moss, fontFamily: type.semibold, fontSize: 13 },
});
