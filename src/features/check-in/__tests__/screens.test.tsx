import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { createActor, type Actor } from 'xstate';

import {
  CHECK_IN_EVENTS,
  CHECK_IN_STATES,
  EMOTION_LABEL_MODES,
  EMOTION_IDS,
  NAVIGATION_EVENTS,
  NAVIGATION_STATES,
} from '@/constants';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { appNavigationMachine } from '@/navigation/app-navigation.machine';
import type { EmotionSelection } from '../domain/check-in';
import { checkInHistoryStore } from '../application/check-in-history.store';
import {
  mockSurrealDatabase,
  resetSurrealDatabaseMock,
} from '@/test-utils/surrealdb.repository.mock';
import { CheckInScreen } from '../ui/check-in-screen';
import { EmotionStar } from '../ui/emotion-star';
import { HistoryScreen } from '../ui/history-screen';
import { ReflectionScreen } from '../ui/reflection-screen';
import { SuccessScreen } from '../ui/success-screen';
import { SettingsScreen } from '@/features/settings/ui/settings-screen';
import { emotionLabelModeStore } from '@/features/settings/application/emotion-label-mode.store';

let mockActor: Actor<typeof appNavigationMachine>;

jest.mock('@/navigation/app-navigation.provider', () => ({
  useAppNavigationActor: () => mockActor,
}));

jest.mock('../infrastructure/surrealdb.database', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockSurrealDatabase)),
}));

const selection = {
  emotionId: EMOTION_IDS.JOY,
  intensity: 0.5,
  level: 2,
  color: '#E7AD32',
} satisfies EmotionSelection;

const _reachReflection = () => {
  mockActor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
  mockActor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
  mockActor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
};

const _renderLocalized = (element: ReactElement) => render(<AppLocaleProvider>{element}</AppLocaleProvider>);

describe('check-in screens', () => {
  beforeEach(() => {
    resetSurrealDatabaseMock();
    checkInHistoryStore.trigger.hydrated({ entries: [] });
    emotionLabelModeStore.trigger.hydrated({ mode: EMOTION_LABEL_MODES.EMOJI });
    mockActor = createActor(appNavigationMachine).start();
  });

  afterEach(() => {
    mockActor.stop();
  });

  it('renders the centered base-state ripple and emotion field', async () => {
    const screen = await _renderLocalized(<CheckInScreen />);
    expect(screen.getByText('How are you feeling right now?')).toBeTruthy();
    expect(screen.getByText('Touch the point')).toBeTruthy();
    expect(screen.getByText('Touch the point')).toHaveStyle({
      fontSize: 16,
      letterSpacing: 0.3,
    });
    expect(screen.getByText('and move your finger.')).toBeTruthy();
    expect(screen.getByText('Release your finger to select the feeling.')).toBeTruthy();
    expect(screen.getByTestId('emotion-readout-prompt')).toHaveStyle({
      alignItems: 'center',
    });
    expect(screen.getByTestId('base-emotion-emoji-freude').props['children'].props['children']).toBe('😊');
    expect(screen.getByTestId('base-emotion-emoji-liebe').props['children'].props['children']).toBe('❤️');
    expect(screen.getByText('The farther you move from the center, the more intense the feeling.')).toBeTruthy();
    expect(screen.getByLabelText('Emotion star. Drag outward from the center.')).toBeTruthy();
    expect(screen.getByTestId('base-state-ripples')).toHaveStyle({
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(screen.getByTestId('ripple-origin')).toHaveStyle({
      width: 8,
      height: 8,
      borderRadius: 4,
    });
    expect(screen.getAllByTestId('water-ripple-ring')[0]).toHaveStyle({
      width: 72,
      height: 72,
      borderRadius: 36,
    });
  });

  it('keeps the star frame and reserved prompt layout stable while selecting an emotion', async () => {
    const props = {
      onCancel: jest.fn(),
      onTouchStart: jest.fn(),
      onSelectionChange: jest.fn(),
      onRelease: jest.fn(),
    };
    const screen = await render(
      <AppLocaleProvider>
        <EmotionStar {...props} selection={null} />
      </AppLocaleProvider>,
    );
    const baseFrameStyle = StyleSheet.flatten(screen.getByTestId('emotion-star-frame').props['style']);
    const baseReadoutStyle = StyleSheet.flatten(screen.getByTestId('emotion-readout').props['style']);
    const baseStarStyle = StyleSheet.flatten(screen.getByTestId('emotion-star').props['style']);

    await screen.rerender(
      <AppLocaleProvider>
        <EmotionStar {...props} selection={selection} />
      </AppLocaleProvider>,
    );

    expect(StyleSheet.flatten(screen.getByTestId('emotion-star-frame').props['style'])).toEqual(baseFrameStyle);
    expect(StyleSheet.flatten(screen.getByTestId('emotion-readout').props['style'])).toEqual(baseReadoutStyle);
    expect(StyleSheet.flatten(screen.getByTestId('emotion-star').props['style'])).toEqual(baseStarStyle);
    expect(screen.getByTestId('emotion-readout-prompt', { includeHiddenElements: true })).toHaveStyle({
      alignItems: 'center',
      opacity: 0,
    });
    expect(screen.getByTestId('emotion-readout-selection')).toHaveStyle({
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  it('maps star responder movement to a selection and release', async () => {
    const onTouchStart = jest.fn();
    const onSelectionChange = jest.fn();
    const onCancel = jest.fn();
    const onRelease = jest.fn();
    const screen = await _renderLocalized(
      <EmotionStar
        selection={selection}
        onCancel={onCancel}
        onTouchStart={onTouchStart}
        onSelectionChange={onSelectionChange}
        onRelease={onRelease}
      />,
    );
    const star = screen.getByLabelText('Joy · Cheerfulness');
    expect(screen.getByTestId('emotion-nuance-reveal')).toBeTruthy();
    expect(screen.getByTestId('emotion-name-reveal')).toBeTruthy();
    expect(screen.getByTestId('emotion-readout-prompt', { includeHiddenElements: true })).toHaveStyle({ opacity: 0 });
    expect(screen.getByTestId('emotion-readout-selection')).toHaveStyle({
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    expect(screen.getByTestId('base-emotion-label-freude').props['children'].props['children']).toBe('Joy');
    expect(screen.getByTestId('base-emotion-emoji-furcht').props['children'].props['children']).toBe('😨');
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
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('shows emoji, text, or both around the untouched star from the app setting', async () => {
    const screen = await _renderLocalized(
      <EmotionStar
        selection={null}
        onCancel={jest.fn()}
        onTouchStart={jest.fn()}
        onSelectionChange={jest.fn()}
        onRelease={jest.fn()}
      />,
    );
    expect(screen.getByTestId('emotion-star').props['accessibilityValue']).toEqual({ text: EMOTION_LABEL_MODES.EMOJI });

    await act(() => emotionLabelModeStore.trigger.changed({ mode: EMOTION_LABEL_MODES.TEXT }));
    expect(screen.getByTestId('emotion-star').props['accessibilityValue']).toEqual({ text: EMOTION_LABEL_MODES.TEXT });

    await act(() => emotionLabelModeStore.trigger.changed({ mode: EMOTION_LABEL_MODES.BOTH }));
    expect(screen.getByTestId('emotion-star').props['accessibilityValue']).toEqual({ text: EMOTION_LABEL_MODES.BOTH });
  });

  it('cancels an interrupted drag instead of releasing its preview', async () => {
    const onCancel = jest.fn();
    const onRelease = jest.fn();
    const screen = await _renderLocalized(
      <EmotionStar
        selection={selection}
        onCancel={onCancel}
        onTouchStart={jest.fn()}
        onSelectionChange={jest.fn()}
        onRelease={onRelease}
      />,
    );

    await fireEvent(screen.getByLabelText('Joy · Cheerfulness'), 'responderTerminate');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onRelease).not.toHaveBeenCalled();
  });

  it('lets the reflection screen edit and submit a note', async () => {
    await act(_reachReflection);
    const screen = await _renderLocalized(<ReflectionScreen />);
    expect(screen.getByLabelText('Optional note about the feeling').props['autoFocus']).toBe(true);
    expect(screen.getByText('Cheerfulness')).toBeTruthy();
    expect(screen.queryByText(/50%/)).toBeNull();
    expect(screen.getByTestId('reflection-keyboard-scroll').props).toMatchObject({
      keyboardDismissMode: 'interactive',
      keyboardShouldPersistTaps: 'handled',
    });
    await fireEvent.changeText(screen.getByLabelText('Optional note about the feeling'), 'Ein heller Moment.');
    await fireEvent.press(screen.getByText('Save check-in'));

    await waitFor(() => expect(mockActor.getSnapshot().matches(CHECK_IN_STATES.SUCCESS)).toBe(true));
    expect(mockActor.getSnapshot().context.saved?.note).toBe('Ein heller Moment.');
  });

  it('renders success, history, and settings destinations', async () => {
    await act(_reachReflection);
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.CONFIRMED }));
    await waitFor(() => expect(mockActor.getSnapshot().matches(CHECK_IN_STATES.SUCCESS)).toBe(true));
    expect(mockActor.getSnapshot().context.saved).not.toBeNull();

    const success = await _renderLocalized(<SuccessScreen />);
    expect(success.getByText('You arrived with yourself.')).toBeTruthy();

    const history = await _renderLocalized(<HistoryScreen />);
    expect(history.getByText(/Joy · Cheerfulness/)).toBeTruthy();

    const settings = await _renderLocalized(<SettingsScreen />);
    expect(settings.getByText('Private by design')).toBeTruthy();
    await fireEvent.press(settings.getByText('German'));
    await waitFor(() => expect(settings.getByText('Von Anfang an privat')).toBeTruthy());
    await fireEvent.press(settings.getByText('Englisch'));
    await waitFor(() => expect(settings.getByText('Private by design')).toBeTruthy());
  });

  it('opens a captured moment for editing when its history row is pressed', async () => {
    await act(_reachReflection);
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.NOTE_CHANGED, note: 'Before' }));
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.CONFIRMED }));
    await waitFor(() => expect(mockActor.getSnapshot().matches(CHECK_IN_STATES.SUCCESS)).toBe(true));
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.RESTARTED }));
    await act(() => mockActor.send({ type: NAVIGATION_EVENTS.HISTORY_OPENED }));

    const history = await _renderLocalized(<HistoryScreen />);
    expect(history.queryByText(/50%/)).toBeNull();
    await fireEvent.press(history.getByText(/Joy · Cheerfulness/));

    expect(mockActor.getSnapshot().matches(NAVIGATION_STATES.REFLECTION)).toBe(true);
    const reflection = await _renderLocalized(<ReflectionScreen />);
    expect(reflection.getByText('Edit this moment.')).toBeTruthy();
    expect(reflection.getByText('Change feeling')).toBeTruthy();
    expect(reflection.getByDisplayValue('Before').props['autoFocus']).toBe(true);
  });

  it('opens the latest captured moment for editing from Today', async () => {
    await act(_reachReflection);
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.CONFIRMED }));
    await waitFor(() => expect(mockActor.getSnapshot().matches(CHECK_IN_STATES.SUCCESS)).toBe(true));
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.RESTARTED }));

    const today = await _renderLocalized(<CheckInScreen />);
    expect(today.queryByText(/50%/)).toBeNull();
    const gestureRegion = today.getByTestId('check-in-gesture-region');
    const detailsScroll = today.getByTestId('check-in-details-scroll');
    expect(within(gestureRegion).getByLabelText('Emotion star. Drag outward from the center.')).toBeTruthy();
    expect(within(detailsScroll).getByText('Latest check-in')).toBeTruthy();
    expect(within(detailsScroll).getByText('Youmotion supports self-awareness and does not replace psychotherapeutic or medical treatment.')).toHaveStyle({ marginTop: 24 });
    expect(detailsScroll.props).toMatchObject({
      contentInsetAdjustmentBehavior: 'automatic',
      showsVerticalScrollIndicator: false,
    });
    expect(StyleSheet.flatten(detailsScroll.props['contentContainerStyle'])).toMatchObject({
      flexGrow: 1,
      paddingBottom: 32,
    });
    await fireEvent.press(today.getByText(/Joy · Cheerfulness/));

    expect(mockActor.getSnapshot().matches(NAVIGATION_STATES.REFLECTION)).toBe(true);
    expect(mockActor.getSnapshot().context.editing).not.toBeNull();
  });
});
