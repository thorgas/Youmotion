import { useSelector } from '@xstate/react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CHECK_IN_EVENTS } from '@/constants';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { savedCheckInCopy } from './emotion-copy';
import { palette, type } from './theme';

const _selectSaved = (snapshot: ReturnType<ReturnType<typeof useAppNavigationActor>['getSnapshot']>) => snapshot.context.saved;

export function SuccessScreen() {
  const actor = useAppNavigationActor();
  const saved = useSelector(actor, _selectSaved);
  const _restart = () => actor.send({ type: CHECK_IN_EVENTS.RESTARTED });

  if (!saved) return null;

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.content}>
        <View style={styles.halo}><Text style={styles.check}>✓</Text></View>
        <Text style={styles.title}><fbt desc="Successful check-in title">You arrived with yourself.</fbt></Text>
        <Text style={styles.copy}>{savedCheckInCopy(saved)}</Text>
        <Pressable accessibilityRole="button" onPress={_restart} style={styles.button}>
          <Text style={styles.buttonText}><fbt desc="Button starting another check-in">New check-in</fbt></Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  halo: { width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, borderColor: palette.moss, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.paperRaised },
  check: { fontFamily: type.sansSemibold, color: palette.moss, fontSize: 32 },
  title: { fontFamily: type.serifSemibold, color: palette.ink, fontSize: 32, textAlign: 'center', marginTop: 22 },
  copy: { fontFamily: type.sans, color: palette.inkMuted, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 330, marginTop: 10 },
  button: { minHeight: 50, backgroundColor: palette.ink, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, marginTop: 28 },
  buttonText: { fontFamily: type.sansSemibold, color: '#FFFFFF', fontSize: 14 },
});
