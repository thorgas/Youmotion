import { render, screen } from '@testing-library/react-native';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { appSettingsStore, insightNotificationStore } from '@/app-stores';
import { ANALYTICS_INSIGHT_TABS, ANALYTICS_TIMEFRAMES, APP_LOCALES, REMINDER_PERMISSION_STATES } from '@/constants';
import { currentDataArchive, PersistedDataArchiveSchema } from '@/features/data-safety/domain/data-archive';
import legacyArchive from '@/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { initialInsightNotificationState, type InsightNotificationState } from '../domain/insight-notification';
import { InsightNotificationControls } from '../ui/insight-notification-controls';

jest.mock('@/navigation/app-navigation.provider', () => ({
  useAppNavigationActor: () => ({ send: jest.fn(), getSnapshot: () => ({ status: 'active' }) }),
}));

const archive = currentDataArchive(Effect.runSync(Schema.decodeUnknown(PersistedDataArchiveSchema)(legacyArchive)));
const scheduled: InsightNotificationState = {
  ...initialInsightNotificationState(), enabled: true,
  pending: {
    id: 'introduction', fireAt: new Date(2026, 9, 1, 21).toISOString(),
    candidates: [{ id: 'allTime:emotion:freude', timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
      tab: ANALYTICS_INSIGHT_TABS.PATTERN, patternId: 'emotion:freude' }],
  },
};

beforeEach(() => {
  appSettingsStore.trigger.hydrated({ settings: { ...archive.settings, locale: APP_LOCALES.ENGLISH } });
  insightNotificationStore.trigger.updated({ settings: scheduled });
  insightNotificationStore.trigger.permissionChanged({ permission: REMINDER_PERMISSION_STATES.GRANTED });
  insightNotificationStore.trigger.busyChanged({ busy: false });
  insightNotificationStore.trigger.pickerChanged({ open: false });
});

const controls = () => <AppLocaleProvider><InsightNotificationControls /></AppLocaleProvider>;

describe('insight notification scheduling feedback', () => {
  it.each([
    [APP_LOCALES.ENGLISH, 'Next notification:'],
    [APP_LOCALES.GERMAN, 'Nächste Benachrichtigung:'],
  ])('shows the registered delivery date and local time in %s', async (locale, label) => {
    appSettingsStore.trigger.hydrated({ settings: { ...archive.settings, locale } });
    await render(controls());
    expect(screen.getByText(new RegExp(label))).toHaveTextContent(/2026/);
    expect(screen.getByText(new RegExp(label))).toHaveTextContent(locale === APP_LOCALES.GERMAN ? /21:00/ : /9:00 PM/);
  });

  it('explains an enabled preference without a waiting insight', async () => {
    insightNotificationStore.trigger.updated({ settings: { ...scheduled, pending: null } });
    await render(controls());
    expect(screen.getByText('No notification is scheduled yet. We will check for new insights when you open Youmotion.')).toBeOnTheScreen();
    expect(screen.queryByText(/Next notification:/)).not.toBeOnTheScreen();
  });

  it('does not claim successful scheduling while reconciliation is running', async () => {
    insightNotificationStore.trigger.busyChanged({ busy: true });
    await render(controls());
    expect(screen.getByText('Checking your next notification…')).toBeOnTheScreen();
    expect(screen.queryByText(/Next notification:/)).not.toBeOnTheScreen();
  });

  it('shows the recoverable error instead of claiming persisted intent was registered', async () => {
    insightNotificationStore.trigger.failed({ message: 'Native registration failed' });
    await render(controls());
    expect(screen.getByRole('alert')).toHaveTextContent('Insight notifications could not be updated. Try again.');
    expect(screen.queryByText(/Next notification:/)).not.toBeOnTheScreen();
  });

  it.each([REMINDER_PERMISSION_STATES.DENIED, REMINDER_PERMISSION_STATES.UNDETERMINED])('does not claim scheduling without granted permission: %s', async (permission) => {
    insightNotificationStore.trigger.permissionChanged({ permission });
    await render(controls());
    expect(screen.queryByText(/Next notification:/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/No notification is scheduled yet/)).not.toBeOnTheScreen();
  });

  it('explains that permission must be restored in system settings', async () => {
    insightNotificationStore.trigger.permissionChanged({ permission: REMINDER_PERMISSION_STATES.DENIED });
    await render(controls());
    expect(screen.getByText('Notifications are turned off in system settings.')).toBeOnTheScreen();
  });

  it('does not show delivery feedback when the preference is disabled', async () => {
    insightNotificationStore.trigger.updated({ settings: initialInsightNotificationState() });
    await render(controls());
    expect(screen.queryByText(/Next notification:/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/No notification is scheduled yet/)).not.toBeOnTheScreen();
  });
});
