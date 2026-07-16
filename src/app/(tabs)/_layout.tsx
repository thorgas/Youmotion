import { Tabs } from 'expo-router';

import { APP_TYPE, NAVIGATION_EVENTS } from '@/constants';
import { historyTabTitle, settingsTabTitle, todayTabTitle } from '@/localization/navigation-copy';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import { HistoryTabIcon, SettingsTabIcon, TodayTabIcon } from '@/navigation/tab-bar-icon';

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
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#292722', tabBarLabelStyle: { fontFamily: APP_TYPE.medium }, tabBarStyle: { backgroundColor: '#FBF8F2' } }}>
      <Tabs.Screen name="today" listeners={_todayListeners} options={{ title: todayTabTitle(), tabBarIcon: TodayTabIcon }} />
      <Tabs.Screen name="history" listeners={_historyListeners} options={{ title: historyTabTitle(), tabBarIcon: HistoryTabIcon }} />
      <Tabs.Screen name="settings" listeners={_settingsListeners} options={{ title: settingsTabTitle(), tabBarIcon: SettingsTabIcon }} />
    </Tabs>
  );
}
