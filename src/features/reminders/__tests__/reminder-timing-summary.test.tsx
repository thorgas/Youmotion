import { render, screen } from '@testing-library/react-native';
import { APP_LOCALES, EMOTION_LABEL_MODES } from '@/constants';
import { appSettingsStore } from '@/app-stores';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { ReminderTimingSummary } from '../ui/reminder-timing-summary';

describe('reminder schedule summary', () => {
  it.each([
    { locale: APP_LOCALES.ENGLISH, daily: 'Daily', selected: 'Mon, Wed, Fri' },
    { locale: APP_LOCALES.GERMAN, daily: 'Täglich', selected: 'Mo, Mi, Fr' },
  ])('shows every saved time and localized days in $locale', async ({ locale, daily, selected }) => {
    appSettingsStore.trigger.hydrated({ settings: {
      locale, emotionLabelMode: EMOTION_LABEL_MODES.BOTH, onboardingCompleted: true,
    } });
    const view = await render(
      <AppLocaleProvider>
        <ReminderTimingSummary timing={{ weekdays: [1, 2, 3, 4, 5, 6, 7], times: [{ hour: 9, minute: 3 }, { hour: 18, minute: 30 }] }} />
      </AppLocaleProvider>,
    );
    expect(screen.getByTestId('reminder-timing-summary')).toHaveTextContent(`${daily} · 09:03, 18:30`);
    await view.rerender(
      <AppLocaleProvider>
        <ReminderTimingSummary timing={{ weekdays: [2, 4, 6], times: [{ hour: 0, minute: 0 }, { hour: 23, minute: 59 }] }} />
      </AppLocaleProvider>,
    );
    expect(screen.getByTestId('reminder-timing-summary')).toHaveTextContent(`${selected} · 00:00, 23:59`);
  });
});
