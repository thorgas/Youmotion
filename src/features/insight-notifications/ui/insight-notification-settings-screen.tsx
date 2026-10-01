import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import assert from '@/assert';
import { NAVIGATION_EVENTS } from '@/constants';
import { AppBackButton } from '@/components/ui/app-back-button';
import { PersistentScrollView } from '@/components/ui/persistent-scroll-view';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { palette, type } from '@/theme';
import { InsightNotificationControls } from './insight-notification-controls';

export function InsightNotificationSettingsScreen() {
  const actor = useAppNavigationActor();
  assert(actor.getSnapshot().status === 'active', 'Insight notification settings require active navigation');
  assert(actor.getSnapshot().can({ type: NAVIGATION_EVENTS.BACK_REQUESTED }), 'Insight notification settings require a return path');
  const _back = () => actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
  return (
    <View style={styles.page} testID="insight-notification-settings-screen">
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}><AppBackButton onPress={_back} testID="insight-notification-settings-back" /></View>
        <PersistentScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}><fbt desc="Insight notification settings eyebrow">NEW INSIGHTS</fbt></Text>
          <Text style={styles.title}><fbt desc="Insight notification settings heading">Notice what emerges.</fbt></Text>
          <InsightNotificationControls />
        </PersistentScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  safeArea: { flex: 1 },
  header: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 20 },
  content: { flexGrow: 1, padding: 24, paddingTop: 20, gap: 16 },
  eyebrow: { fontFamily: type.semibold, color: palette.moss, fontSize: 11, letterSpacing: 1.4 },
  title: { fontFamily: type.semibold, color: palette.ink, fontSize: 34, lineHeight: 40 },
});
