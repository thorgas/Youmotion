import { useSelector } from '@xstate/react';
import { PressableScale } from 'pressto';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CHECK_IN_EVENTS } from '@/constants';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { savedCheckInCopy } from './emotion-copy';
import { guidingBeliefSystemText } from './belief-system-copy';
import { palette, type } from './theme';

const _selectContext = (
  snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>,
) => snapshot.context;

export function SuccessScreen() {
  const actor = useAppNavigationActor();
  const context = useSelector(actor, _selectContext);
  const saved = context.saved;
  const guidingStatement = saved?.beliefSystemId
    ? guidingBeliefSystemText({
        id: saved.beliefSystemId,
        statements: context.beliefStatements,
      })
    : undefined;
  const _finish = () => actor.send({ type: CHECK_IN_EVENTS.RESTARTED });

  if (!saved) return null;

  return (
    <View style={styles.page} testID="success-screen">
      <SafeAreaView style={styles.content}>
        <View style={styles.halo}><Text style={styles.check}>✓</Text></View>
        <Text style={styles.title}><fbt desc="Successful check-in title">You arrived with yourself.</fbt></Text>
        <Text style={styles.copy}>{savedCheckInCopy(saved)}</Text>
        {guidingStatement ? (
          <View style={styles.guidingCard} testID="success-guiding-belief">
            <Text style={styles.guidingLabel}>
              <fbt desc="Label above the positive guiding belief on the completed check-in screen">
                Your guiding belief
              </fbt>
            </Text>
            <Text style={styles.guidingText}>{guidingStatement}</Text>
          </View>
        ) : null}
        <PressableScale accessibilityRole="button" onPress={_finish} style={styles.button} testID="check-in-done">
          <Text style={styles.buttonText}><fbt desc="Button finishing the completed check-in flow">Done</fbt></Text>
        </PressableScale>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  halo: { width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, borderColor: palette.moss, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.paperRaised },
  check: { fontFamily: type.semibold, color: palette.moss, fontSize: 32 },
  title: { fontFamily: type.semibold, color: palette.ink, fontSize: 32, textAlign: 'center', marginTop: 22 },
  copy: { fontFamily: type.regular, color: palette.inkMuted, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 330, marginTop: 10 },
  guidingCard: {
    width: '100%',
    maxWidth: 360,
    marginTop: 24,
    padding: 20,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: palette.moss,
    backgroundColor: '#EDF0EB',
  },
  guidingLabel: {
    fontFamily: type.semibold,
    color: palette.moss,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  guidingText: {
    fontFamily: type.medium,
    color: palette.ink,
    fontSize: 17,
    lineHeight: 25,
    marginTop: 8,
  },
  button: { minHeight: 50, backgroundColor: palette.ink, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, marginTop: 28 },
  buttonText: { fontFamily: type.semibold, color: '#FFFFFF', fontSize: 14 },
});
