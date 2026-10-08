import { useMachine } from '@xstate/react';
import { fbs } from 'fbtee';
import { StyleSheet, Text, View } from 'react-native';

import assert from '@/assert';
import { Button } from '@/components/ui/button';
import { SettingsActionRow } from '@/components/ui/settings-action-row';
import { SOURCE_CODE_EVENTS, SOURCE_CODE_STATES } from '@/constants';
import { palette, type } from '@/theme';
import { sourceCodeMachine } from '../application/source-code.machine';

export function SourceCodeSettingsAction() {
  const [snapshot, , actor] = useMachine(sourceCodeMachine);
  assert(snapshot.status !== 'stopped', 'Source code actions require an active browser actor.');
  const opening = snapshot.matches(SOURCE_CODE_STATES.OPENING);
  const failed = snapshot.matches(SOURCE_CODE_STATES.FAILURE);
  assert(!(opening && failed), 'Source code cannot be opening and failed at the same time.');
  const _open = () => actor.send({ type: SOURCE_CODE_EVENTS.OPEN_REQUESTED });
  const _dismiss = () => actor.send({ type: SOURCE_CODE_EVENTS.DISMISSED });

  return (
    <View>
      <SettingsActionRow
        description={String(fbs('Explore the Youmotion repository on GitHub.', 'Settings source code link explanation'))}
        disabled={opening}
        onPress={_open}
        testID="open-source-code"
        title={String(fbs('Source code', 'Settings source code link title'))}
      />
      {failed ? (
        <View accessibilityRole="alert" testID="source-code-error">
          <Text style={styles.failureText}>
            <fbt desc="Source code browser failure message">The repository could not be opened. Please try again.</fbt>
          </Text>
          <View style={styles.actions}>
            <Button.Root label={String(fbs('Dismiss', 'Dismiss source code browser failure'))} onPress={_dismiss} size="compact" testID="dismiss-source-code-error" variant="ghost">
              <Button.Text><fbt desc="Dismiss source code browser failure">Dismiss</fbt></Button.Text>
            </Button.Root>
            <Button.Root label={String(fbs('Try again', 'Retry source code browser failure'))} onPress={_open} size="compact" testID="retry-source-code" variant="ghost">
              <Button.Text><fbt desc="Retry source code browser failure">Try again</fbt></Button.Text>
            </Button.Root>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  failureText: { color: palette.ink, fontFamily: type.regular, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 12 },
});
