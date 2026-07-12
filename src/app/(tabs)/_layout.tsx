import { Tabs } from 'expo-router';

import { NAVIGATION_EVENTS } from '@/constants';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';

export default function TabLayout() {
  const actor = useAppNavigationActor();
  const _todayListeners = {
    tabPress: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      actor.send({ type: NAVIGATION_EVENTS.TODAY_OPENED });
    },
  };
  const _historyListeners = {
    tabPress: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      actor.send({ type: NAVIGATION_EVENTS.HISTORY_OPENED });
    },
  };
  const _settingsListeners = {
    tabPress: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    },
  };

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#292722', tabBarStyle: { backgroundColor: '#FBF8F2' } }}>
      <Tabs.Screen name="today" listeners={_todayListeners} options={{ title: 'Heute' }} />
      <Tabs.Screen name="history" listeners={_historyListeners} options={{ title: 'Verlauf' }} />
      <Tabs.Screen name="settings" listeners={_settingsListeners} options={{ title: 'Einstellungen' }} />
    </Tabs>
  );
}
