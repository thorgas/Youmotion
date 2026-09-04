import {
  act,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import { createActor, type Actor } from 'xstate';

import {
  APP_LOCALES,
  APP_ROUTES,
  EMOTION_IDS,
  EMOTION_LABEL_MODES,
  NAVIGATION_EVENTS,
  NAVIGATION_STATES,
  ONBOARDING_EVENTS,
  ONBOARDING_STATES,
} from '@/constants';
import { checkInHistoryStore } from '@/app-stores';
import { appSettingsStore } from '@/app-stores';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import {
  appNavigationMachine,
  routeForStateValue,
} from '@/navigation/app-navigation.machine';
import {
  mockSurrealDatabase,
  resetSurrealDatabaseMock,
} from '@/test-utils/surrealdb.repository.mock';
import { OnboardingScreen } from '../ui/onboarding-screen';

let mockActor: Actor<typeof appNavigationMachine>;

jest.mock('@/navigation/app-navigation.provider', () => ({
  useAppNavigationActor: () => mockActor,
}));

jest.mock('@/infrastructure/database/surrealdb.database', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockSurrealDatabase)),
  queryDatabase: jest.fn(({ surql, variables }: {
    surql: string;
    variables?: Parameters<typeof mockSurrealDatabase.query>[1];
  }) => variables === undefined
    ? mockSurrealDatabase.query(surql)
    : mockSurrealDatabase.query(surql, variables)),
}));

const _panEvent = ({
  timestamp,
  x,
  y,
}: {
  timestamp: number;
  x: number;
  y: number;
}) => ({
  nativeEvent: { locationX: x, locationY: y },
  touchHistory: {
    touchBank: [{
      touchActive: true,
      currentTimeStamp: timestamp,
      currentPageX: x,
      currentPageY: y,
      previousPageX: x,
      previousPageY: y,
    }],
    numberActiveTouches: 1,
    indexOfSingleActiveTouch: 0,
    mostRecentTimeStamp: timestamp,
  },
});

describe('explanation onboarding screen', () => {
  beforeEach(() => {
    resetSurrealDatabaseMock();
    checkInHistoryStore.trigger.hydrated({ entries: [] });
    appSettingsStore.trigger.hydrated({
      settings: {
        locale: APP_LOCALES.ENGLISH,
        emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
        onboardingCompleted: false,
      },
    });
    mockActor = createActor(appNavigationMachine).start();
  });

  afterEach(() => {
    mockActor.stop();
  });

  it('teaches the real Pulse gesture without saving its practice selection', async () => {
    const screen = await render(
      <AppLocaleProvider>
        <OnboardingScreen />
      </AppLocaleProvider>,
    );

    expect(screen.getByText('Make space for what is here.')).toBeTruthy();
    expect(screen.getByLabelText('Step 1 of 3')).toBeTruthy();
    expect(screen.getByText(/No account is needed/)).toBeTruthy();
    expect(
      screen.getByTestId('onboarding-privacy-symbol', {
        includeHiddenElements: true,
      }).props,
    ).toMatchObject({
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
    });
    expect(screen.getByTestId('onboarding-content-scroll').props).toMatchObject({
      bounces: true,
      scrollEnabled: true,
    });

    await fireEvent.press(screen.getByTestId('onboarding-primary-action'));
    expect(mockActor.getSnapshot().matches({
      [NAVIGATION_STATES.ONBOARDING]: ONBOARDING_STATES.PULSE,
    })).toBe(true);
    expect(screen.getByLabelText('Step 2 of 3')).toBeTruthy();
    expect(screen.getByText('Imagine your chest tightens before a difficult meeting.')).toBeTruthy();
    expect(screen.getByTestId('onboarding-content-scroll').props).toMatchObject({
      bounces: false,
      scrollEnabled: false,
    });

    const star = screen.getByTestId('emotion-star');
    await fireEvent(star, 'responderGrant', _panEvent({
      timestamp: 1,
      x: 195,
      y: 195,
    }));
    await fireEvent(star, 'responderMove', _panEvent({
      timestamp: 2,
      x: 260,
      y: 130,
    }));
    await fireEvent(star, 'responderRelease');

    expect(mockActor.getSnapshot().context.onboardingSelection?.emotionId).toBe(
      EMOTION_IDS.JOY,
    );
    expect(screen.getByText('This is a practice example. It is not saved to your history.')).toBeTruthy();
    expect(checkInHistoryStore.getSnapshot().context.entries).toEqual([]);

    await fireEvent.press(screen.getByTestId('onboarding-primary-action'));
    expect(mockActor.getSnapshot().matches({
      [NAVIGATION_STATES.ONBOARDING]: ONBOARDING_STATES.EXAMPLE,
    })).toBe(true);
    expect(mockActor.getSnapshot().context.onboardingSelection?.emotionId).toBe(
      EMOTION_IDS.FEAR,
    );
    expect(screen.getByLabelText('Step 3 of 3')).toBeTruthy();
    expect(screen.getByText('Worry · Fear')).toBeTruthy();
    expect(screen.getByText('“My chest tightened before the meeting.”')).toBeTruthy();
    expect(screen.getByText(/Going deeper is always optional/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('onboarding-primary-action'));
    expect(routeForStateValue(mockActor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);
    expect(checkInHistoryStore.getSnapshot().context.entries).toEqual([]);
  });

  it('provides a non-gesture example and returns a replay to Settings', async () => {
    mockActor.stop();
    appSettingsStore.trigger.onboardingCompletedChanged({ completed: true });
    mockActor = createActor(appNavigationMachine).start();
    mockActor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    mockActor.send({ type: ONBOARDING_EVENTS.OPENED });
    const screen = await render(
      <AppLocaleProvider>
        <OnboardingScreen />
      </AppLocaleProvider>,
    );

    await fireEvent.press(screen.getByTestId('onboarding-primary-action'));
    expect(screen.getByText('Show the example')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('onboarding-primary-action'));

    expect(mockActor.getSnapshot().context.onboardingSelection).not.toBeNull();
    await waitFor(() => expect(screen.getByText('Continue')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('onboarding-skip'));

    expect(mockActor.getSnapshot().matches({
      [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.SETTINGS,
    })).toBe(true);
    expect(appSettingsStore.getSnapshot().context.onboardingCompleted).toBe(true);
  });

  it('clears an interrupted practice and moves back to the welcome step', async () => {
    const screen = await render(
      <AppLocaleProvider>
        <OnboardingScreen />
      </AppLocaleProvider>,
    );
    await fireEvent.press(screen.getByTestId('onboarding-primary-action'));
    await fireEvent.press(screen.getByTestId('onboarding-primary-action'));
    expect(mockActor.getSnapshot().context.onboardingSelection).not.toBeNull();

    await act(() => mockActor.send({ type: ONBOARDING_EVENTS.SELECTION_CANCELLED }));
    expect(mockActor.getSnapshot().context.onboardingSelection).toBeNull();
    await fireEvent.press(screen.getByTestId('onboarding-back'));

    expect(screen.getByText('Make space for what is here.')).toBeTruthy();
  });

  it('renders the onboarding and progress semantics in German', async () => {
    await act(() => appSettingsStore.trigger.languageChanged({
      locale: APP_LOCALES.GERMAN,
    }));
    const screen = await render(
      <AppLocaleProvider>
        <OnboardingScreen />
      </AppLocaleProvider>,
    );

    expect(screen.getByText('Gib dem Raum, was gerade da ist.')).toBeTruthy();
    expect(screen.getByText(/Du brauchst kein Konto/)).toBeTruthy();
    expect(screen.getByLabelText('Schritt 1 von 3')).toBeTruthy();
    expect(screen.getByText('So funktioniert es')).toBeTruthy();
  });
});
