import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { NAVIGATION_EVENTS } from '@/constants';
import TabLayout from '../(tabs)/_layout';

const mockSelectionAsync = jest.fn(() => Promise.resolve());
const mockMatches = jest.fn();
const mockSend = jest.fn();
const mockTabListeners = new Map<string, {
  tabPress: (event: { preventDefault: () => void }) => void;
}>();

function mockTabs({ children }: { children: ReactNode }) {
  return children;
}

jest.mock('expo-haptics', () => ({
  selectionAsync: () => mockSelectionAsync(),
}));

jest.mock('@/navigation/app-navigation.provider', () => ({
  useAppNavigationActor: () => ({
    getSnapshot: () => ({ matches: mockMatches }),
    send: mockSend,
  }),
}));

jest.mock('@/localization/navigation-copy', () => ({
  analyticsTabTitle: () => 'Insights',
  historyTabTitle: () => 'History',
  settingsTabTitle: () => 'Settings',
  todayTabTitle: () => 'Today',
}));

jest.mock('expo-router', () => {
  const Screen = ({
    listeners,
    name,
  }: {
    listeners: { tabPress: (event: { preventDefault: () => void }) => void };
    name: string;
  }) => {
    mockTabListeners.set(name, listeners);
    return null;
  };
  const Tabs = Object.assign(mockTabs, { Screen });
  return { Tabs };
});

function tabPress(name: string) {
  const listeners = mockTabListeners.get(name);
  if (!listeners) throw new Error(`Missing ${name} tab listeners.`);
  const preventDefault = jest.fn();
  listeners.tabPress({ preventDefault });
  return preventDefault;
}

describe('tab selection feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTabListeners.clear();
  });

  it('navigates without haptic feedback when the selected tab is pressed again', async () => {
    mockMatches.mockReturnValue(true);
    await render(<TabLayout />);

    const preventDefault = tabPress('today');

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(mockSelectionAsync).not.toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledWith({ type: NAVIGATION_EVENTS.TODAY_OPENED });
  });

  it('provides one haptic and navigates when the destination changes', async () => {
    mockMatches.mockReturnValue(false);
    await render(<TabLayout />);

    tabPress('history');

    expect(mockSelectionAsync).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith({ type: NAVIGATION_EVENTS.HISTORY_OPENED });
  });

  it('still navigates when native haptic feedback rejects', async () => {
    mockMatches.mockReturnValue(false);
    mockSelectionAsync.mockRejectedValueOnce(new Error('Haptics unavailable'));
    await render(<TabLayout />);

    tabPress('settings');

    expect(mockSend).toHaveBeenCalledWith({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
  });
});
