import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

type TabBarIconProps = {
  color: ColorValue;
  focused: boolean;
  size: number;
};

type TabSymbolName = SymbolViewProps['name'];

const todayName: TabSymbolName = { ios: 'circle.grid.cross.fill', android: 'blur_circular', web: 'blur_circular' };
const historyName: TabSymbolName = { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' };
const analyticsName: TabSymbolName = { ios: 'chart.xyaxis.line', android: 'insights', web: 'insights' };
const settingsName: TabSymbolName = { ios: 'gearshape.fill', android: 'settings', web: 'settings' };

function TabBarSymbol({ color, name, size }: TabBarIconProps & { name: TabSymbolName }) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}

export function TodayTabIcon(props: TabBarIconProps) {
  return <TabBarSymbol {...props} name={todayName} />;
}

export function HistoryTabIcon(props: TabBarIconProps) {
  return <TabBarSymbol {...props} name={historyName} />;
}

export function AnalyticsTabIcon(props: TabBarIconProps) {
  return <TabBarSymbol {...props} name={analyticsName} />;
}

export function SettingsTabIcon(props: TabBarIconProps) {
  return <TabBarSymbol {...props} name={settingsName} />;
}
