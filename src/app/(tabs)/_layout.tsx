import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';

import { APP_TYPE, NAVIGATION_EVENTS, NAVIGATION_STATES } from '@/constants';
import {
  analyticsTabTitle,
  historyTabTitle,
  settingsTabTitle,
  todayTabTitle,
} from '@/localization/navigation-copy';
import { useAppNavigationActor } from '@/navigation/app-navigation.provider';
import {
  AnalyticsTabIcon,
  HistoryTabIcon,
  SettingsTabIcon,
  TodayTabIcon,
} from '@/navigation/tab-bar-icon';

const _provideSelectionFeedback = (selected: boolean) => {
  if (!selected) void Haptics.selectionAsync().catch(() => undefined);
};

export default function TabLayout() {
  const actor = useAppNavigationActor();
  const _todayListeners = {
    tabPress: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      _provideSelectionFeedback(actor.getSnapshot().matches({
        [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.TODAY,
      }));
      actor.send({ type: NAVIGATION_EVENTS.TODAY_OPENED });
    },
  };
  const _historyListeners = {
    tabPress: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      _provideSelectionFeedback(actor.getSnapshot().matches({
        [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.HISTORY,
      }));
      actor.send({ type: NAVIGATION_EVENTS.HISTORY_OPENED });
    },
  };
  const _analyticsListeners = {
    tabPress: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      _provideSelectionFeedback(actor.getSnapshot().matches({
        [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.ANALYTICS,
      }));
      actor.send({ type: NAVIGATION_EVENTS.ANALYTICS_OPENED });
    },
  };
  const _settingsListeners = {
    tabPress: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      _provideSelectionFeedback(actor.getSnapshot().matches({
        [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.SETTINGS,
      }));
      actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    },
  };

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#292722', tabBarLabelStyle: { fontFamily: APP_TYPE.medium }, tabBarStyle: { backgroundColor: '#FBF8F2' } }}>
      <Tabs.Screen name="today" listeners={_todayListeners} options={{ title: todayTabTitle(), tabBarButtonTestID: 'tab-today', tabBarIcon: TodayTabIcon }} />
      <Tabs.Screen name="history" listeners={_historyListeners} options={{ title: historyTabTitle(), tabBarButtonTestID: 'tab-history', tabBarIcon: HistoryTabIcon }} />
      <Tabs.Screen name="analytics" listeners={_analyticsListeners} options={{ title: analyticsTabTitle(), tabBarButtonTestID: 'tab-analytics', tabBarIcon: AnalyticsTabIcon }} />
      <Tabs.Screen name="settings" listeners={_settingsListeners} options={{ title: settingsTabTitle(), tabBarButtonTestID: 'tab-settings', tabBarIcon: SettingsTabIcon }} />
    </Tabs>
  );
}
