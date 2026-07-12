import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { createActor, type Actor } from 'xstate';

import { CHECK_IN_EVENTS, CHECK_IN_STATES, EMOTION_IDS } from '@/constants';
import { appNavigationMachine } from '@/navigation/app-navigation.machine';
import type { EmotionSelection } from '../domain/check-in';
import { checkInHistoryStore } from '../application/check-in-history.store';
import { CheckInScreen } from '../ui/check-in-screen';
import { EmotionStar } from '../ui/emotion-star';
import { HistoryScreen } from '../ui/history-screen';
import { ReflectionScreen } from '../ui/reflection-screen';
import { SuccessScreen } from '../ui/success-screen';
import { SettingsScreen } from '@/features/settings/ui/settings-screen';

let mockActor: Actor<typeof appNavigationMachine>;

jest.mock('@/navigation/app-navigation.provider', () => ({
  useAppNavigationActor: () => mockActor,
}));

const selection = {
  emotionId: EMOTION_IDS.JOY,
  emotion: 'Freude',
  nuance: 'Fröhlichkeit',
  intensity: 0.5,
  level: 2,
  color: '#E7AD32',
} satisfies EmotionSelection;

const _reachReflection = () => {
  mockActor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
  mockActor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
  mockActor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
};

describe('check-in screens', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    checkInHistoryStore.trigger.hydrated({ entries: [] });
    mockActor = createActor(appNavigationMachine).start();
  });

  afterEach(() => {
    mockActor.stop();
  });

  it('renders the painterly star and current history summary', async () => {
    const screen = await render(<CheckInScreen />);
    expect(screen.getByText('Wie fühlst du dich?')).toBeTruthy();
    expect(screen.getByLabelText('Gefühlsstern. Ziehe vom Zentrum nach außen.')).toBeTruthy();
    expect(screen.getByText('HALTEN · ZIEHEN · LOSLASSEN')).toBeTruthy();
  });

  it('maps star responder movement to a selection and release', async () => {
    const onTouchStart = jest.fn();
    const onSelectionChange = jest.fn();
    const onRelease = jest.fn();
    const screen = await render(
      <EmotionStar
        selection={selection}
        onTouchStart={onTouchStart}
        onSelectionChange={onSelectionChange}
        onRelease={onRelease}
      />,
    );
    const star = screen.getByLabelText('Freude, Fröhlichkeit, Intensität 50 Prozent');
    const grantEvent = {
      nativeEvent: { locationX: 185, locationY: 40 },
      touchHistory: {
        touchBank: [{
          touchActive: true,
          currentTimeStamp: 1,
          currentPageX: 185,
          currentPageY: 40,
          previousPageX: 185,
          previousPageY: 40,
        }],
        numberActiveTouches: 1,
        indexOfSingleActiveTouch: 0,
        mostRecentTimeStamp: 1,
      },
    };
    const moveEvent = {
      nativeEvent: { locationX: 240, locationY: 185 },
      touchHistory: {
        touchBank: [{
          touchActive: true,
          currentTimeStamp: 2,
          currentPageX: 240,
          currentPageY: 185,
          previousPageX: 185,
          previousPageY: 40,
        }],
        numberActiveTouches: 1,
        indexOfSingleActiveTouch: 0,
        mostRecentTimeStamp: 2,
      },
    };

    await fireEvent(star, 'responderGrant', grantEvent);
    await fireEvent(star, 'responderMove', moveEvent);
    await fireEvent(star, 'responderRelease');

    expect(onTouchStart).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledTimes(2);
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it('lets the reflection screen edit and submit a note', async () => {
    await act(_reachReflection);
    const screen = await render(<ReflectionScreen />);
    await fireEvent.changeText(screen.getByLabelText('Optionale Notiz zum Gefühl'), 'Ein heller Moment.');
    await fireEvent.press(screen.getByText('Check-in speichern'));

    await waitFor(() => expect(mockActor.getSnapshot().matches(CHECK_IN_STATES.SUCCESS)).toBe(true));
    expect(mockActor.getSnapshot().context.saved?.note).toBe('Ein heller Moment.');
  });

  it('renders success, history, and settings destinations', async () => {
    await act(_reachReflection);
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.CONFIRMED }));
    await waitFor(() => expect(mockActor.getSnapshot().matches(CHECK_IN_STATES.SUCCESS)).toBe(true));
    expect(mockActor.getSnapshot().context.saved).not.toBeNull();

    const success = await render(<SuccessScreen />);
    expect(success.getByText('Bei dir angekommen.')).toBeTruthy();

    const history = await render(<HistoryScreen />);
    expect(history.getByText(/Freude · Fröhlichkeit/)).toBeTruthy();

    const settings = await render(<SettingsScreen />);
    expect(settings.getByText('Privat by design')).toBeTruthy();
  });
});
