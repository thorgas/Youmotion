import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { createActor, type Actor } from 'xstate';

import {
  APP_LOCALES,
  CHECK_IN_EVENTS,
  CHECK_IN_STATES,
  EMOTION_LABEL_MODES,
  EMOTION_IDS,
  BELIEF_SYSTEM_IDS,
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
import { selectionFromPoint } from '../domain/emotion-selection';
import { EmotionStar } from '../ui/emotion-star';
import { HistoryScreen } from '../ui/history-screen';
import { ReflectionScreen } from '../ui/reflection-screen';
import { GuidingBeliefScreen } from '../ui/guiding-belief-screen';
import { SuccessScreen } from '../ui/success-screen';
import { SettingsScreen } from '@/features/settings/ui/settings-screen';
import { appSettingsStore } from '@/features/settings/application/app-settings.store';

let mockActor: Actor<typeof appNavigationMachine>;

jest.mock('@/navigation/app-navigation.provider', () => ({
  useAppNavigationActor: () => mockActor,
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: { gitCommit: 'f4610f7c58dcae3d2f552e2c6651c2a9a62884e9' },
      version: '1.0.0',
    },
  },
}));

jest.mock('expo-updates', () => ({
  channel: 'development',
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

const _finishWithoutBeliefSystem = async () => {
  await waitFor(() => expect(
    mockActor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM),
  ).toBe(true));
  await act(() => mockActor.send({ type: CHECK_IN_EVENTS.CONFIRMED }));
  await waitFor(() => expect(
    mockActor.getSnapshot().matches(CHECK_IN_STATES.SUCCESS),
  ).toBe(true));
};

const _renderLocalized = (element: ReactElement) => render(<AppLocaleProvider>{element}</AppLocaleProvider>);
const _panEvent = ({ x, y, timestamp }: { x: number; y: number; timestamp: number }) => ({
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

describe('check-in screens', () => {
  beforeEach(() => {
    resetSurrealDatabaseMock();
    checkInHistoryStore.trigger.hydrated({ entries: [] });
    appSettingsStore.trigger.hydrated({
      settings: {
        locale: APP_LOCALES.ENGLISH,
        emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
      },
    });
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
    expect(screen.getByTestId('base-emotion-emoji-freude')).toHaveTextContent('😊');
    expect(screen.getByTestId('base-emotion-emoji-liebe')).toHaveTextContent('❤️');
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
    expect(screen.queryByTestId('base-emotion-emoji-freude')).toBeNull();
    expect(screen.getByTestId('base-emotion-label-freude')).toBeTruthy();
    expect(screen.getAllByTestId(/^base-emotion-emoji-/)).toHaveLength(6);
    expect(screen.getAllByTestId(/^base-emotion-label-/)).toHaveLength(1);

    await screen.rerender(
      <AppLocaleProvider>
        <EmotionStar {...props} selection={null} />
      </AppLocaleProvider>,
    );

    expect(screen.getAllByTestId(/^base-emotion-emoji-/)).toHaveLength(7);
    expect(screen.queryAllByTestId(/^base-emotion-label-/)).toHaveLength(0);
  });

  it('coalesces continuous drag positions and publishes the exact released intensity', async () => {
    const send = jest.spyOn(mockActor, 'send');
    const screen = await _renderLocalized(<CheckInScreen />);
    const star = screen.getByTestId('emotion-star');
    const grantPoint = { x: 195, y: 115, timestamp: 1 };
    const movePointOne = { x: 195, y: 114, timestamp: 2 };
    const movePointTwo = { x: 195, y: 113, timestamp: 3 };
    const finalPoint = { x: 195, y: 112, timestamp: 4 };

    await fireEvent(star, 'responderGrant', _panEvent(grantPoint));
    await fireEvent(star, 'responderMove', _panEvent(movePointOne));
    await fireEvent(star, 'responderMove', _panEvent(movePointTwo));
    await fireEvent(star, 'responderMove', _panEvent(finalPoint));

    const previewEvents = send.mock.calls.filter(([event]) => event.type === CHECK_IN_EVENTS.SELECTION_CHANGED);
    expect(previewEvents).toHaveLength(1);

    await fireEvent(star, 'responderRelease');

    const selectionEvents = send.mock.calls.filter(([event]) => event.type === CHECK_IN_EVENTS.SELECTION_CHANGED);
    expect(selectionEvents).toHaveLength(2);
    expect(selectionEvents[1]?.[0]).toEqual({
      type: CHECK_IN_EVENTS.SELECTION_CHANGED,
      selection: selectionFromPoint({
        point: finalPoint,
        center: { x: 195, y: 195 },
        maxRadius: 140.4,
      }),
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
    expect(screen.getByTestId('base-emotion-label-freude')).toHaveTextContent('Joy');
    expect(screen.getByTestId('base-emotion-emoji-furcht')).toHaveTextContent('😨');
    const grantEvent = _panEvent({ x: 185, y: 40, timestamp: 1 });
    const moveEvent = _panEvent({ x: 240, y: 185, timestamp: 2 });

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
    expect(screen.getAllByTestId(/^base-emotion-emoji-/)).toHaveLength(7);
    expect(screen.queryAllByTestId(/^base-emotion-label-/)).toHaveLength(0);

    await act(() => appSettingsStore.trigger.emotionLabelModeChanged({
      mode: EMOTION_LABEL_MODES.TEXT,
    }));
    expect(screen.getByTestId('emotion-star').props['accessibilityValue']).toEqual({ text: EMOTION_LABEL_MODES.TEXT });
    expect(screen.queryAllByTestId(/^base-emotion-emoji-/)).toHaveLength(0);
    expect(screen.getAllByTestId(/^base-emotion-label-/)).toHaveLength(7);

    await act(() => appSettingsStore.trigger.emotionLabelModeChanged({
      mode: EMOTION_LABEL_MODES.BOTH,
    }));
    expect(screen.getByTestId('emotion-star').props['accessibilityValue']).toEqual({ text: EMOTION_LABEL_MODES.BOTH });
    expect(screen.getAllByTestId(/^base-emotion-emoji-/)).toHaveLength(7);
    expect(screen.getAllByTestId(/^base-emotion-label-/)).toHaveLength(7);

    await act(() => appSettingsStore.trigger.emotionLabelModeChanged({
      mode: EMOTION_LABEL_MODES.EMOJI,
    }));
    expect(screen.getAllByTestId(/^base-emotion-emoji-/)).toHaveLength(7);
    expect(screen.queryAllByTestId(/^base-emotion-label-/)).toHaveLength(0);
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

  it('saves a reflection before offering the optional core belief step', async () => {
    await act(_reachReflection);
    const screen = await _renderLocalized(<ReflectionScreen />);
    expect(screen.getByLabelText('Optional note about the feeling').props['autoFocus']).toBe(true);
    expect(screen.getByText('Cheerfulness')).toBeTruthy();
    expect(screen.queryByText(/50%/)).toBeNull();
    expect(screen.getByTestId('reflection-keyboard-scroll').props).toMatchObject({
      keyboardDismissMode: 'interactive',
      keyboardShouldPersistTaps: 'handled',
    });
    expect(screen.queryByText('Does a core belief fit this moment?')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Optional note about the feeling'), 'Ein heller Moment.');
    await fireEvent.press(screen.getByText('Save reflection'));

    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM),
    ).toBe(true));
    expect(mockActor.getSnapshot().context.saved?.note).toBe('Ein heller Moment.');
    expect(mockActor.getSnapshot().context.saved?.beliefSystemId).toBeUndefined();
    expect(await screen.findByText('Your reflection is already saved. Add one only if it feels useful.')).toBeTruthy();
    expect(screen.getByTestId('belief-system-browse').props['accessibilityRole']).toBe('button');

    await fireEvent.press(screen.getByTestId('belief-system-browse'));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM_CATALOG),
    ).toBe(true));
    expect(await screen.findByText('Choose what feels familiar.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId(
      `belief-system-option-${BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING}`,
    ));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM),
    ).toBe(true));
    await fireEvent.press(screen.getByTestId('belief-system-finish'));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.GUIDING_BELIEF),
    ).toBe(true));
    await screen.rerender(
      <AppLocaleProvider><GuidingBeliefScreen /></AppLocaleProvider>,
    );
    expect(screen.getByText('What would support you instead?')).toBeTruthy();
    expect(screen.getByText(/What did this rule once help you gain or protect/)).toBeTruthy();
    expect(screen.getByTestId('guiding-source-belief')).toHaveTextContent(
      'I always have to function.',
    );
    await fireEvent.changeText(
      screen.getByTestId('guiding-belief-draft'),
      'I may pause and I am still loved.',
    );
    await fireEvent.press(screen.getByTestId('guiding-belief-save'));

    await waitFor(() => expect(mockActor.getSnapshot().matches(CHECK_IN_STATES.SUCCESS)).toBe(true));
    expect(mockActor.getSnapshot().context.saved?.beliefSystemId).toBe(
      BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    );
    const success = await _renderLocalized(<SuccessScreen />);
    expect(success.getByTestId('success-guiding-belief')).toBeTruthy();
    expect(success.getByText('Your guiding belief')).toBeTruthy();
    expect(success.getByText('I may pause and I am still loved.')).toBeTruthy();

    const saved = mockActor.getSnapshot().context.saved;
    if (!saved) throw new Error('Successful persistence must expose the saved check-in.');
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.RESTARTED }));
    await act(() => mockActor.send({ type: NAVIGATION_EVENTS.HISTORY_OPENED }));

    const history = await _renderLocalized(<HistoryScreen />);
    expect(history.getByText('Released core belief')).toBeTruthy();
    expect(history.getByText('Your guiding belief')).toBeTruthy();
    expect(history.getByTestId(`history-released-belief-${saved.id}`)).toHaveStyle({
      color: '#9A8F87',
      fontSize: 12,
      textDecorationLine: 'line-through',
    });
    expect(history.getByTestId(`history-guiding-belief-card-${saved.id}`)).toHaveStyle({
      backgroundColor: '#EDF0EB',
      borderWidth: 1,
    });
    expect(history.getByTestId(`history-guiding-belief-${saved.id}`)).toHaveStyle({
      color: '#2A2722',
      fontSize: 14,
    });
    expect(history.getByTestId(`history-guiding-belief-${saved.id}`)).toHaveTextContent(
      'I may pause and I am still loved.',
    );
  });

  it('creates and reuses a personal core belief from the catalog', async () => {
    await act(_reachReflection);
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.CONFIRMED }));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM),
    ).toBe(true));
    const screen = await _renderLocalized(<ReflectionScreen />);

    await fireEvent.press(screen.getByTestId('belief-system-browse'));
    await fireEvent.press(screen.getByTestId('create-custom-belief'));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM_EDITOR),
    ).toBe(true));
    await fireEvent.changeText(
      screen.getByTestId('belief-system-draft'),
      'I must earn every pause.',
    );
    await fireEvent.press(screen.getByTestId('belief-system-editor-save'));

    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM),
    ).toBe(true));
    expect(await screen.findByText('I must earn every pause.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Attach and continue'));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.GUIDING_BELIEF),
    ).toBe(true));
    await screen.rerender(
      <AppLocaleProvider><GuidingBeliefScreen /></AppLocaleProvider>,
    );
    expect(screen.getByDisplayValue('I must earn every pause.')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByTestId('guiding-source-belief-draft'),
      'I must always earn every pause.',
    );
    await fireEvent.changeText(
      screen.getByTestId('guiding-belief-draft'),
      'Rest is part of a full life.',
    );
    await fireEvent.press(screen.getByTestId('guiding-belief-save'));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.SUCCESS),
    ).toBe(true));

    const success = await _renderLocalized(<SuccessScreen />);
    expect(success.getByText('Rest is part of a full life.')).toBeTruthy();
  });

  it('uses distinct harmful and guiding belief terms in the German locale', async () => {
    await act(() => appSettingsStore.trigger.languageChanged({
      locale: APP_LOCALES.GERMAN,
    }));
    await act(_reachReflection);
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.CONFIRMED }));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM),
    ).toBe(true));
    const screen = await _renderLocalized(<ReflectionScreen />);

    expect(screen.getByText('Passt ein Leidsatz zu diesem Moment?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Alle Leidsätze ansehen'));
    expect(await screen.findByText('LEIDSÄTZE')).toBeTruthy();
    await fireEvent.press(screen.getByText('Eigenen Leidsatz hinzufügen'));
    expect(await screen.findByText('Füge deinen eigenen Leidsatz hinzu.')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByTestId('belief-system-draft'),
      'Ich muss immer funktionieren.',
    );
    await fireEvent.press(screen.getByTestId('belief-system-editor-save'));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM),
    ).toBe(true));
    await fireEvent.press(screen.getByTestId('belief-system-finish'));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.GUIDING_BELIEF),
    ).toBe(true));
    await screen.rerender(
      <AppLocaleProvider><GuidingBeliefScreen /></AppLocaleProvider>,
    );
    expect(screen.getByText('04 · NEUE RICHTUNG · SCHRITT 3 VON 3')).toBeTruthy();
    expect(screen.getByText(/Zurück/)).toBeTruthy();
    expect(screen.getByText('Was würde dich stattdessen unterstützen?')).toBeTruthy();
    expect(screen.getByPlaceholderText(
      'Ich darf auch mal nicht funktionieren und werde trotzdem geliebt.',
    )).toBeTruthy();
    await fireEvent.changeText(
      screen.getByTestId('guiding-belief-draft'),
      'Ich darf innehalten und werde trotzdem geliebt.',
    );
    await fireEvent.press(screen.getByTestId('guiding-belief-save'));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.SUCCESS),
    ).toBe(true));
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.RESTARTED }));
    await act(() => mockActor.send({ type: NAVIGATION_EVENTS.HISTORY_OPENED }));

    const history = await _renderLocalized(<HistoryScreen />);
    expect(history.getByText('Losgelassener Leidsatz')).toBeTruthy();
    expect(history.getByText('Dein Leitsatz')).toBeTruthy();
    expect(history.getByText(
      'Ich darf innehalten und werde trotzdem geliebt.',
    )).toBeTruthy();
  });

  it('renders success, history, and settings destinations', async () => {
    await act(_reachReflection);
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.CONFIRMED }));
    await _finishWithoutBeliefSystem();
    expect(mockActor.getSnapshot().context.saved).not.toBeNull();

    const success = await _renderLocalized(<SuccessScreen />);
    expect(success.getByText('You arrived with yourself.')).toBeTruthy();
    expect(success.getByText('Done')).toBeTruthy();
    expect(success.queryByText('New check-in')).toBeNull();

    const history = await _renderLocalized(<HistoryScreen />);
    expect(history.getByText(/Joy · Cheerfulness/)).toBeTruthy();

    const settings = await _renderLocalized(<SettingsScreen />);
    expect(settings.getByText('Private by design')).toBeTruthy();
    expect(settings.getByText('App information')).toBeTruthy();
    expect(settings.getByText('App')).toBeTruthy();
    expect(settings.getByText('Channel')).toBeTruthy();
    expect(settings.getByText('Git')).toBeTruthy();
    expect(settings.getByText('1.0.0')).toBeTruthy();
    expect(settings.getByText('development')).toBeTruthy();
    expect(settings.getByText('f4610f7')).toBeTruthy();
    await fireEvent.press(settings.getByText('German'));
    await waitFor(() => expect(settings.getByText('Von Anfang an privat')).toBeTruthy());
    expect(settings.getByText('App-Informationen')).toBeTruthy();
    await fireEvent.press(settings.getByText('Englisch'));
    await waitFor(() => expect(settings.getByText('Private by design')).toBeTruthy());
  });

  it('opens a captured moment for editing when its history row is pressed', async () => {
    await act(_reachReflection);
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.NOTE_CHANGED, note: 'Before' }));
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.CONFIRMED }));
    await _finishWithoutBeliefSystem();
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.RESTARTED }));
    await act(() => mockActor.send({ type: NAVIGATION_EVENTS.HISTORY_OPENED }));

    const history = await _renderLocalized(<HistoryScreen />);
    expect(history.queryByText(/50%/)).toBeNull();
    await fireEvent.press(history.getByText(/Joy · Cheerfulness/));

    expect(mockActor.getSnapshot().matches(NAVIGATION_STATES.REFLECTION)).toBe(true);
    const reflection = await _renderLocalized(<ReflectionScreen />);
    expect(reflection.getByText('Edit this moment.')).toBeTruthy();
    expect(reflection.getByText('Change feeling')).toBeTruthy();
    expect(reflection.getByTestId('delete-edited-moment')).toBeTruthy();
    expect(reflection.getByDisplayValue('Before').props['autoFocus']).toBe(true);
  });

  it('confirms and deletes a captured moment by long-pressing its history row', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await act(_reachReflection);
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.CONFIRMED }));
    await _finishWithoutBeliefSystem();
    const saved = mockActor.getSnapshot().context.saved;
    if (!saved) throw new Error('Successful persistence must expose the saved check-in.');
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.RESTARTED }));
    await act(() => mockActor.send({ type: NAVIGATION_EVENTS.HISTORY_OPENED }));

    const history = await _renderLocalized(<HistoryScreen />);
    await fireEvent(history.getByTestId(`history-moment-${saved.id}`), 'longPress');
    const buttons = alert.mock.calls[alert.mock.calls.length - 1]?.[2];
    const destructive = buttons?.find((button) => button.style === 'destructive');
    await act(() => destructive?.onPress?.());

    await waitFor(() => expect(
      checkInHistoryStore.getSnapshot().context.entries,
    ).toHaveLength(0));
  });

  it('deletes the current moment from its edit screen and returns to history', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await act(_reachReflection);
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.NOTE_CHANGED, note: 'Remove me' }));
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.CONFIRMED }));
    await _finishWithoutBeliefSystem();
    const saved = mockActor.getSnapshot().context.saved;
    if (!saved) throw new Error('Successful persistence must expose the saved check-in.');
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.RESTARTED }));
    await act(() => mockActor.send({ type: NAVIGATION_EVENTS.HISTORY_OPENED }));
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.EDIT_REQUESTED, entry: saved }));

    const reflection = await _renderLocalized(<ReflectionScreen />);
    await fireEvent.press(reflection.getByTestId('delete-edited-moment'));
    const buttons = alert.mock.calls[alert.mock.calls.length - 1]?.[2];
    const destructive = buttons?.find((button) => button.style === 'destructive');
    await act(() => destructive?.onPress?.());

    await waitFor(() => expect(
      mockActor.getSnapshot().matches({
        [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.HISTORY,
      }),
    ).toBe(true));
    expect(checkInHistoryStore.getSnapshot().context.entries).toHaveLength(0);
  });

  it('opens the latest captured moment for editing from Today', async () => {
    await act(_reachReflection);
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.CONFIRMED }));
    await _finishWithoutBeliefSystem();
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
