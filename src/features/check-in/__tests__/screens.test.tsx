import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { useFocusEffect } from 'expo-router';
import type { ReactElement } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { createActor, type Actor } from 'xstate';
import { NONE } from 'react-native-surrealdb';

import {
  APP_LOCALES,
  ANALYTICS_TIMEFRAMES,
  BELIEF_LIBRARY_EVENTS,
  BELIEF_LIBRARY_STATES,
  CHECK_IN_EVENTS,
  CHECK_IN_STATES,
  EMOTION_LABEL_MODES,
  EMOTION_IDS,
  BELIEF_SYSTEM_IDS,
  NAVIGATION_EVENTS,
  NAVIGATION_STATES,
  ONBOARDING_EVENTS,
  ONBOARDING_STATES,
  HISTORY_EVENTS,
} from '@/constants';
import { AppLocaleProvider } from '@/localization/app-locale-provider';
import { appNavigationMachine } from '@/navigation/app-navigation.machine';
import {
  CheckInId,
  CheckInTimestamp,
  type CheckIn,
  type EmotionSelection,
} from '../domain/check-in';
import {
  CustomBeliefSystemId,
  type BeliefStatement,
} from '../domain/belief-statement';
import { checkInHistoryStore } from '../application/check-in-history.store';
import { historyTimeframeStore } from '../application/history-timeframe.store';
import {
  mockSurrealDatabase,
  mockSurrealQuery,
  resetSurrealDatabaseMock,
} from '@/test-utils/surrealdb.repository.mock';
import { CheckInScreen } from '../ui/check-in-screen';
import { selectionFromPoint } from '../domain/emotion-selection';
import { EmotionStar } from '../ui/emotion-star';
import { HistoryScreen } from '../ui/history-screen';
import { beginReflectionInputSession } from '../ui/reflection-input-session';
import { ReflectionScreen } from '../ui/reflection-screen';
import { reflectionResponsiveLayout } from '../ui/reflection-responsive-layout';
import { GuidingBeliefScreen } from '../ui/guiding-belief-screen';
import { SuccessScreen } from '../ui/success-screen';
import { SettingsScreen } from '@/features/settings/ui/settings-screen';
import { BeliefLibraryScreen } from '@/features/settings/ui/belief-library-screen';
import { appSettingsStore } from '@/features/settings/application/app-settings.store';
import {
  BaseStateRipples,
  CenteredBaseStateRipples,
} from '../ui/base-state-ripples';
import { palette } from '../ui/theme';

let mockActor: Actor<typeof appNavigationMachine>;

jest.mock('@/navigation/app-navigation.provider', () => ({
  useAppNavigationActor: () => mockActor,
}));

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
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

describe('reflection responsive layout', () => {
  it('compacts the keyboard-open Android viewport without double-scaling density', () => {
    expect(reflectionResponsiveLayout({
      height: 914,
      keyboardHeight: 420,
      keyboardVisible: true,
      platform: 'android',
      width: 411,
    })).toMatchObject({
      bottomOffset: 12,
      compact: true,
      contentHorizontalPadding: 22,
      inputMinHeight: 112,
      keyboardAwareScrollEnabled: false,
      titleFontSize: 28,
    });
  });

  it('preserves the spacious layout without a constrained Android keyboard', () => {
    expect(reflectionResponsiveLayout({
      height: 914,
      keyboardHeight: 0,
      keyboardVisible: false,
      platform: 'android',
      width: 320,
    })).toMatchObject({
      bottomOffset: 82,
      compact: false,
      contentHorizontalPadding: 20,
      inputMinHeight: 150,
      keyboardAwareScrollEnabled: true,
      titleFontSize: 31,
    });
  });
});

describe('reflection input focus lifecycle', () => {
  it('focuses a new input session and blurs it when the step ends', () => {
    const input = {
      blur: jest.fn(),
      focus: jest.fn(),
    };

    const endSession = beginReflectionInputSession(input);

    expect(input.focus).toHaveBeenCalledTimes(1);
    expect(input.blur).not.toHaveBeenCalled();

    endSession();

    expect(input.blur).toHaveBeenCalledTimes(1);
  });
});

function RippleOriginHarness({ centered }: { centered: boolean }) {
  const offsetX = useSharedValue(55);
  const offsetY = useSharedValue(-75);
  if (centered) return <CenteredBaseStateRipples />;
  return <BaseStateRipples offsetX={offsetX} offsetY={offsetY} />;
}

describe('check-in screens', () => {
  beforeEach(() => {
    jest.mocked(useFocusEffect).mockClear();
    resetSurrealDatabaseMock();
    checkInHistoryStore.trigger.hydrated({ entries: [] });
    historyTimeframeStore.trigger[HISTORY_EVENTS.TIMEFRAME_SELECTED]({
      timeframe: ANALYTICS_TIMEFRAMES.ALL_TIME,
    });
    appSettingsStore.trigger.hydrated({
      settings: {
        locale: APP_LOCALES.ENGLISH,
        emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
        onboardingCompleted: true,
      },
    });
    mockActor = createActor(appNavigationMachine).start();
  });

  afterEach(() => {
    mockActor.stop();
  });

  it('renders the centered base-state ripple and emotion field', async () => {
    const screen = await _renderLocalized(<CheckInScreen />);
    const title = screen.getByText('How are you feeling right now?');
    expect(screen.getByTestId('today-eyebrow')).toHaveTextContent('TODAY');
    expect(title).toHaveStyle({
      fontSize: 34,
      lineHeight: 40,
    });
    expect(StyleSheet.flatten(title.props['style'])).not.toHaveProperty('textAlign');
    expect(screen.queryByText(
      'There is no right or wrong choice here. Follow your first impression and choose what feels right to you.',
    )).toBeNull();
    expect(screen.getByTestId('today-pulse-card')).toHaveStyle({
      backgroundColor: palette.paperRaised,
      borderColor: palette.hairline,
      borderRadius: 30,
      borderWidth: 1,
    });
    expect(screen.getByText('Touch the point and move your finger.')).toHaveStyle({
      fontSize: 16,
      letterSpacing: 0.3,
      lineHeight: 20,
    });
    expect(screen.getByText(
      'Choose the feeling that feels right to you, then release your finger.',
    )).toHaveStyle({
      fontSize: 12,
      letterSpacing: 0.3,
      lineHeight: 18,
      marginTop: 4,
    });
    expect(screen.getByTestId('emotion-readout-prompt')).toHaveStyle({
      alignItems: 'center',
    });
    expect(screen.getByTestId('emotion-readout')).toHaveStyle({
      marginBottom: -16,
    });
    expect(screen.getByTestId('base-emotion-emoji-freude')).toHaveTextContent('😊');
    expect(screen.getByTestId('base-emotion-emoji-liebe')).toHaveTextContent('❤️');
    expect(screen.getByText('The farther you move from the center, the more intense the feeling.')).toBeTruthy();
    expect(screen.queryByTestId('emotion-word-help-toggle')).toBeNull();
    expect(screen.queryByTestId('emotion-word-help-content')).toBeNull();
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

  it('asks German readers to choose the feeling that feels right to them', async () => {
    await act(() => appSettingsStore.trigger.languageChanged({
      locale: APP_LOCALES.GERMAN,
    }));
    const screen = await _renderLocalized(<CheckInScreen />);

    expect(screen.getByText(
      'Berühre den Punkt und bewege deinen Finger.',
    )).toBeTruthy();
    expect(screen.getByText(
      'Wähle das Gefühl aus, das sich für dich stimmig anfühlt, und lasse deinen Finger los.',
    )).toBeTruthy();
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
      justifyContent: 'flex-start',
      opacity: 0,
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('emotion-readout-prompt', {
          includeHiddenElements: true,
        }).props['style'],
      ),
    ).not.toHaveProperty('transform');
    expect(screen.getByTestId('emotion-readout-selection')).toHaveStyle({
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      justifyContent: 'flex-start',
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

  it('recenters the regular Pulse origin after leaving the selection flow', async () => {
    const screen = await _renderLocalized(<CheckInScreen />);
    const star = screen.getByTestId('emotion-star');

    await fireEvent(
      star,
      'responderGrant',
      _panEvent({ x: 250, y: 120, timestamp: 1 }),
    );
    await fireEvent(star, 'responderRelease');
    await act(() => mockActor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED }));

    expect(mockActor.getSnapshot().context.selection).toBeNull();
    expect(StyleSheet.flatten(screen.getByTestId('base-state-ripples').props['style']))
      .toMatchObject({
        transform: [{ translateX: 0 }, { translateY: 0 }],
      });
  });

  it('centers a reset Pulse origin without changing onboarding preservation', async () => {
    const screen = await render(<RippleOriginHarness centered={false} />);
    expect(StyleSheet.flatten(screen.getByTestId('base-state-ripples').props['style']))
      .toMatchObject({
        transform: [{ translateX: 55 }, { translateY: -75 }],
      });

    await screen.rerender(
      <RippleOriginHarness centered />,
    );
    expect(StyleSheet.flatten(screen.getByTestId('base-state-ripples').props['style']))
      .toMatchObject({
        transform: [{ translateX: 0 }, { translateY: 0 }],
      });
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
    const progressHeader = screen.getByTestId('check-in-progress-header');
    const progressHeaderStyle = progressHeader.props['style'];
    expect(progressHeader.parent?.children.indexOf(progressHeader)).toBe(0);
    expect(screen.getByTestId('check-in-progress-step-1-active')).toBeTruthy();
    expect(screen.getByTestId('check-in-progress-step-2-upcoming')).toBeTruthy();
    expect(screen.getByTestId('check-in-progress-step-3-upcoming')).toBeTruthy();
    expect(screen.getByTestId('check-in-progress').props).toMatchObject({
      accessibilityRole: 'progressbar',
      accessibilityValue: { min: 1, max: 3, now: 1 },
    });
    expect(within(screen.getByTestId('check-in-progress')).getAllByText('Optional')).toHaveLength(2);
    expect(screen.getByText(
      "Next, you can add or change this moment's core belief and guiding belief. Both steps are optional.",
    )).toBeTruthy();
    expect(useFocusEffect).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Optional note about the feeling').props['autoFocus']).toBeUndefined();
    expect(screen.getByText('Cheerfulness')).toBeTruthy();
    expect(screen.queryByText(/50%/)).toBeNull();
    expect(screen.getByTestId('reflection-keyboard-scroll').props).toMatchObject({
      keyboardDismissMode: 'interactive',
      keyboardShouldPersistTaps: 'handled',
    });
    expect(within(screen.getByTestId('reflection-keyboard-scroll')).queryByTestId(
      'check-in-progress-header',
    )).toBeNull();
    expect(screen.queryByText('Does a core belief fit this moment?')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Optional note about the feeling'), 'Ein heller Moment.');
    await fireEvent.press(screen.getByText('Save and continue'));

    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM),
    ).toBe(true));
    expect(mockActor.getSnapshot().context.saved?.note).toBe('Ein heller Moment.');
    expect(mockActor.getSnapshot().context.saved?.beliefSystemId).toBeUndefined();
    expect(await screen.findByText(
      'A core belief is an inner rule that limits you in this moment.',
    )).toBeTruthy();
    expect(screen.getByTestId('check-in-progress-step-1-complete')).toBeTruthy();
    expect(screen.getByTestId('check-in-progress-step-2-active')).toBeTruthy();
    const beliefProgressHeader = screen.getByTestId('check-in-progress-header');
    expect(beliefProgressHeader.props['style']).toEqual(progressHeaderStyle);
    expect(beliefProgressHeader.parent?.children.indexOf(beliefProgressHeader)).toBe(0);
    expect(within(screen.getByTestId('belief-system-step')).queryByTestId(
      'check-in-progress-header',
    )).toBeNull();
    expect(screen.getByTestId('check-in-progress').props['accessibilityValue']).toMatchObject({
      now: 2,
    });
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
    expect(screen.getByTestId('check-in-progress-step-1-complete')).toBeTruthy();
    expect(screen.getByTestId('check-in-progress-step-2-complete')).toBeTruthy();
    expect(screen.getByTestId('check-in-progress-step-3-active')).toBeTruthy();
    const guidingProgressHeader = screen.getByTestId('check-in-progress-header');
    expect(guidingProgressHeader.props['style']).toEqual(progressHeaderStyle);
    expect(guidingProgressHeader.parent?.children.indexOf(guidingProgressHeader)).toBe(0);
    expect(within(screen.getByTestId('guiding-belief-scroll')).queryByTestId(
      'check-in-progress-header',
    )).toBeNull();
    expect(screen.getByTestId('check-in-progress').props['accessibilityValue']).toMatchObject({
      now: 3,
    });
    expect(screen.queryByTestId('guiding-belief-help')).toBeNull();
    expect(screen.queryByText(/What did this rule once help you gain or protect/)).toBeNull();
    await fireEvent.press(screen.getByTestId('guiding-belief-help-toggle'));
    expect(screen.getByTestId('guiding-belief-help')).toBeTruthy();
    expect(screen.getByText(/What did this rule once help you gain or protect/)).toBeTruthy();
    expect(screen.getByTestId('guiding-source-belief')).toHaveTextContent(
      'I always have to function.',
    );
    expect(screen.queryByTestId('saved-guiding-belief-reason')).toBeNull();
    const finishWithoutGuidingBelief = screen.getByTestId('guiding-belief-finish');
    expect(finishWithoutGuidingBelief.props['accessibilityState']).toEqual({
      disabled: false,
    });
    expect(screen.getByText('Finish without a guiding belief')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByTestId('guiding-belief-draft'),
      'I may pause and I am still loved.',
    );
    expect(screen.getByText('Save and finish')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('guiding-belief-finish'));

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
      fontFamily: 'InstrumentSans_600SemiBold',
      fontSize: 15,
    });
    expect(history.getByTestId(`history-guiding-belief-${saved.id}`)).toHaveTextContent(
      'I may pause and I am still loved.',
    );
  });

  it('submits a reflection from the native keyboard before offering the optional core belief step', async () => {
    await act(_reachReflection);
    const screen = await _renderLocalized(<ReflectionScreen />);
    const noteInput = screen.getByLabelText('Optional note about the feeling');

    await fireEvent.changeText(noteInput, 'Ein heller Moment.');
    await fireEvent(noteInput, 'submitEditing', {
      nativeEvent: { text: 'Ein heller Moment.' },
    });

    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM),
    ).toBe(true));
    expect(mockActor.getSnapshot().context.saved?.note).toBe('Ein heller Moment.');
    expect(await screen.findByText(
      'A core belief is an inner rule that limits you in this moment.',
    )).toBeTruthy();
  });

  it('starts the reflection placeholder with concrete examples in English and German', async () => {
    await act(_reachReflection);
    const screen = await _renderLocalized(<ReflectionScreen />);
    expect(screen.getByPlaceholderText(
      'A behavior, a thought, a body sensation, a situation…',
    )).toBeTruthy();

    await act(() => appSettingsStore.trigger.languageChanged({
      locale: APP_LOCALES.GERMAN,
    }));

    expect(screen.getByPlaceholderText(
      'Ein Verhalten, ein Gedanke, ein Körpergefühl, eine Situation …',
    )).toBeTruthy();
  });

  it('restores the released and guiding belief hierarchy after cold hydration', async () => {
    const checkInId = CheckInId.make('cold-history-belief');
    const createdAt = CheckInTimestamp.make('2026-07-19T01:06:00.000Z');
    mockActor.stop();
    checkInHistoryStore.trigger.hydrated({ entries: [] });
    mockSurrealQuery.mockImplementation(async (surql) => {
      if (surql.startsWith('SELECT checkInId AS id')) {
        return [{
          statementIndex: 0,
          value: [{
            id: checkInId,
            createdAt,
            emotionId: EMOTION_IDS.FEAR,
            intensity: 0.5,
            level: 2,
            note: 'A moment when I need rest.',
            beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
          }],
        }];
      }
      if (surql.startsWith('SELECT kind, statementId AS beliefSystemId')) {
        return [{
          statementIndex: 0,
          value: [{
            kind: 'built-in',
            beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
            harmfulStatement: NONE,
            guidingStatement: 'I may pause and I am still loved.',
            archivedAt: NONE,
          }, {
            kind: 'custom',
            beliefSystemId: CustomBeliefSystemId.make('custom-without-guiding'),
            harmfulStatement: 'I must never need help.',
            guidingStatement: NONE,
            archivedAt: NONE,
          }],
        }];
      }
      if (surql.startsWith('SELECT locale, emotionLabelMode')) {
        return [{
          statementIndex: 0,
          value: [{
            locale: APP_LOCALES.ENGLISH,
            emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
          }],
        }];
      }
      return [{ statementIndex: 0, value: null }];
    });

    mockActor = createActor(appNavigationMachine).start();
    await waitFor(() => expect(
      checkInHistoryStore.getSnapshot().context.entries,
    ).toHaveLength(1));
    await waitFor(() => expect(
      mockActor.getSnapshot().context.beliefStatements,
    ).toContainEqual({
      kind: 'built-in',
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
      guidingStatement: 'I may pause and I am still loved.',
    }));

    const history = await _renderLocalized(<HistoryScreen />);
    expect(history.getByTestId(`history-released-belief-${checkInId}`)).toHaveStyle({
      color: '#9A8F87',
      textDecorationLine: 'line-through',
    });
    expect(history.getByTestId(`history-guiding-belief-${checkInId}`)).toHaveStyle({
      fontFamily: 'InstrumentSans_600SemiBold',
      fontSize: 15,
    });
    expect(history.getByText('I always have to function.')).toBeTruthy();
    expect(history.getByText('I may pause and I am still loved.')).toBeTruthy();
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
    await fireEvent.press(screen.getByTestId('guiding-belief-finish'));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.SUCCESS),
    ).toBe(true));

    const success = await _renderLocalized(<SuccessScreen />);
    expect(success.getByText('Rest is part of a full life.')).toBeTruthy();
  });

  it('finishes the optional guiding belief step through its enabled primary action', async () => {
    await act(_reachReflection);
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.CONFIRMED }));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM),
    ).toBe(true));
    await act(() => mockActor.send({
      type: CHECK_IN_EVENTS.BELIEF_SYSTEM_CHANGED,
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    }));
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.CONFIRMED }));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.GUIDING_BELIEF),
    ).toBe(true));

    const screen = await _renderLocalized(<GuidingBeliefScreen />);
    const finish = screen.getByTestId('guiding-belief-finish');
    expect(finish.props['accessibilityState']).toEqual({ disabled: false });
    expect(screen.getByText('Finish without a guiding belief')).toBeTruthy();
    expect(screen.queryByTestId('guiding-belief-save')).toBeNull();
    expect(screen.queryByTestId('guiding-belief-skip')).toBeNull();

    await fireEvent.press(finish);
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.SUCCESS),
    ).toBe(true));
  });

  it('explains a reused guiding belief during a fresh check-in', async () => {
    await act(() => appSettingsStore.trigger.languageChanged({
      locale: APP_LOCALES.GERMAN,
    }));
    await act(() => mockActor.send({
      type: CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATED,
      statements: [{
        kind: 'built-in',
        beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
        guidingStatement: 'Ich darf auch einmal mich priorisieren.',
      }],
    }));
    await act(_reachReflection);
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.CONFIRMED }));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.BELIEF_SYSTEM),
    ).toBe(true));
    await act(() => mockActor.send({
      type: CHECK_IN_EVENTS.BELIEF_SYSTEM_CHANGED,
      beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
    }));
    await act(() => mockActor.send({ type: CHECK_IN_EVENTS.CONFIRMED }));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(CHECK_IN_STATES.GUIDING_BELIEF),
    ).toBe(true));

    const screen = await _renderLocalized(<GuidingBeliefScreen />);
    expect(screen.getByDisplayValue('Ich darf auch einmal mich priorisieren.')).toBeTruthy();
    expect(screen.getByTestId('saved-guiding-belief-reason')).toBeTruthy();
    expect(screen.getByText('Bereits für diesen Leidsatz gespeichert')).toBeTruthy();
    expect(screen.getByText(
      'Darum ist dein Leitsatz hier schon eingetragen. Du kannst ihn übernehmen oder verändern.',
    )).toBeTruthy();
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
    expect(screen.getByText(
      'Ein Leidsatz ist eine innere Regel, die dich in diesem Moment einengt. Oft enthalten Leidsätze Absolutismen wie “immer” und “alles” und “nie”.',
    )).toBeTruthy();
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
    expect(screen.getByText('04 · NEUE RICHTUNG')).toBeTruthy();
    const progress = within(screen.getByTestId('check-in-progress'));
    expect(progress.getByText('Moment')).toBeTruthy();
    expect(progress.getByText('Leidsatz')).toBeTruthy();
    expect(progress.getByText('Leitsatz')).toBeTruthy();
    expect(progress.getAllByText('Optional')).toHaveLength(2);
    expect(screen.getByText(/Zurück/)).toBeTruthy();
    expect(screen.getByText('Was würde dich stattdessen unterstützen?')).toBeTruthy();
    expect(screen.getByText(
      'Dein Leidsatz beschreibt, was dich einengt. Dein Leitsatz gibt dir eine hilfreichere Richtung.',
    )).toBeTruthy();
    expect(screen.queryByText(/Spüre nach/)).toBeNull();
    expect(screen.queryByText(/Du kannst ihr eine neue Richtung geben/)).toBeNull();
    expect(screen.getByTestId('guiding-belief-scroll').props).toMatchObject({
      showsVerticalScrollIndicator: true,
    });
    expect(screen.getByText('Dein neuer Leitsatz')).toBeTruthy();
    expect(screen.queryByText(
      'Schreibe hier deinen neuen Leitsatz auf, z. B.:',
    )).toBeNull();
    expect(screen.getByPlaceholderText(
      'Schreibe hier deinen neuen Leitsatz auf, z. B.: Ich darf auch mal nicht funktionieren und werde trotzdem geliebt.',
    )).toBeTruthy();
    expect(screen.getByText('Ohne Leitsatz abschließen')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByTestId('guiding-belief-draft'),
      'Ich darf innehalten und werde trotzdem geliebt.',
    );
    expect(screen.getByText('Speichern und abschließen')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('guiding-belief-finish'));
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

    await act(() => mockActor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED }));
    await act(() => mockActor.send({ type: BELIEF_LIBRARY_EVENTS.OPENED }));
    const library = await _renderLocalized(<BeliefLibraryScreen />);
    expect(library.getByText('Einstellungen')).toBeTruthy();
    expect(library.queryByText('‹ Einstellungen')).toBeNull();
    expect(library.getByText('Eigenen Leidsatz hinzufügen')).toBeTruthy();
    expect(library.getByText('Formuliere ihn in deinen eigenen Worten.')).toBeTruthy();
    expect(library.getByText('+')).toBeTruthy();
    await fireEvent.press(library.getByText('Eigenen Leidsatz hinzufügen'));
    expect(library.getByText('LEIDSATZ HINZUFÜGEN')).toBeTruthy();
    expect(library.getByText(
      'Benenne den Satz, der Leiden verursacht. Ein Leidsatz ist eine innere Regel, die dich in diesem Moment einengt. Oft enthalten Leidsätze Absolutismen wie “immer” und “alles” und “nie”. Du kannst direkt einen unterstützenden Leitsatz ergänzen oder das Feld leer lassen.',
    )).toBeTruthy();
    expect(library.getByTestId('belief-library-harmful-card')).toBeTruthy();
    expect(library.getByTestId('belief-library-guiding-card')).toBeTruthy();
    expect(library.getByText('Dein Leidsatz')).toBeTruthy();
    expect(library.getByText('Dein neuer Leitsatz')).toBeTruthy();
    expect(library.getByTestId('belief-library-guiding-draft').props['placeholder']).toBe(
      'Schreibe hier deinen neuen Leitsatz auf, z. B.: Ich darf auch mal nicht funktionieren und werde trotzdem geliebt.',
    );
    expect(library.getByText('Brauchst du Schreibhilfe?')).toBeTruthy();
    await fireEvent.press(library.getByTestId('belief-library-guiding-help-toggle'));
    expect(library.getByText('Nimm dir einen Moment, bevor du ihn neu formulierst')).toBeTruthy();
    await fireEvent.press(library.getByTestId('belief-library-editor-cancel'));
    expect(library.getByText('LEIDSATZ · EINENGEND')).toBeTruthy();
    expect(library.getByText('LEITSATZ · UNTERSTÜTZEND')).toBeTruthy();
    await fireEvent.press(library.getByText('Bearbeiten'));
    expect(library.getByText('Deine Leidsätze')).toBeTruthy();
    expect(library.queryByText('‹ Deine Leidsätze')).toBeNull();
  });

  it('filters history moments with its all-time default preserved', async () => {
    const moments = [{
      id: CheckInId.make('history-current-week'),
      createdAt: CheckInTimestamp.make(new Date(2026, 6, 21, 12).toISOString()),
      emotionId: EMOTION_IDS.JOY,
      intensity: 0.5,
      level: 2,
      note: 'Current week',
    }, {
      id: CheckInId.make('history-previous-week'),
      createdAt: CheckInTimestamp.make(new Date(2026, 6, 19, 12).toISOString()),
      emotionId: EMOTION_IDS.FEAR,
      intensity: 0.5,
      level: 2,
      note: 'Previous week',
    }] satisfies readonly CheckIn[];
    checkInHistoryStore.trigger.hydrated({ entries: moments });

    const history = await _renderLocalized(
      <HistoryScreen now={new Date(2026, 6, 21, 12)} />,
    );
    expect(history.getByTestId('history-moment-history-current-week')).toBeTruthy();
    expect(history.getByTestId('history-moment-history-previous-week')).toBeTruthy();

    await fireEvent.press(history.getByTestId('analytics-timeframe-last-week'));

    await waitFor(() => expect(
      history.queryByTestId('history-moment-history-current-week'),
    ).toBeNull());
    expect(history.getByTestId('history-moment-history-previous-week')).toBeTruthy();
  });

  it('labels an unreframed harmful belief and renders it as muted text', async () => {
    await act(() => appSettingsStore.trigger.languageChanged({
      locale: APP_LOCALES.GERMAN,
    }));
    checkInHistoryStore.trigger.hydrated({
      entries: [{
        id: CheckInId.make('history-harmful-belief'),
        createdAt: CheckInTimestamp.make(new Date(2026, 6, 21, 12).toISOString()),
        emotionId: EMOTION_IDS.SADNESS,
        intensity: 0.5,
        level: 2,
        note: 'A difficult moment.',
        beliefSystemId: BELIEF_SYSTEM_IDS.ALWAYS_FUNCTIONING,
      }],
    });

    const history = await _renderLocalized(<HistoryScreen />);

    expect(history.getByTestId(
      'history-harmful-belief-label-history-harmful-belief',
    )).toHaveTextContent('Leidsatz');
    expect(history.getByTestId(
      'history-harmful-belief-label-history-harmful-belief',
    )).toHaveStyle({
      color: palette.releasedInk,
      textTransform: 'uppercase',
    });
    expect(history.getByTestId(
      'history-harmful-belief-history-harmful-belief',
    )).toHaveTextContent('Ich muss immer funktionieren.');
    expect(history.getByTestId(
      'history-harmful-belief-history-harmful-belief',
    )).toHaveStyle({
      color: palette.inkMuted,
      fontFamily: 'InstrumentSans_400Regular',
      fontSize: 12,
    });
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

  it('makes backup controls visible and requires confirmation before deleting moments', async () => {
    await act(() => mockActor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED }));
    const settings = await _renderLocalized(<SettingsScreen />);

    expect(settings.getByRole('button', { name: /Export a backup/ })).toBeEnabled();
    expect(settings.getByRole('button', { name: /Restore from a backup/ })).toBeEnabled();
    await fireEvent.press(settings.getByRole('button', { name: /Delete all moments/ }));

    expect(settings.getByRole('alert')).toHaveTextContent('Delete every moment?');
    expect(settings.getByRole('button', { name: 'Delete moments' })).toBeEnabled();
    await fireEvent.press(settings.getByRole('button', { name: 'Cancel' }));

    expect(settings.queryByText('Delete every moment?')).not.toBeOnTheScreen();
  });

  it('edits and removes personal beliefs from the settings library', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const beliefSystemId = CustomBeliefSystemId.make('custom-settings-library');
    await act(() => mockActor.send({
      type: CHECK_IN_EVENTS.BELIEF_STATEMENTS_HYDRATED,
      statements: [{
        kind: 'custom',
        beliefSystemId,
        harmfulStatement: 'I must never need help.',
        guidingStatement: 'I can ask for support.',
      }] satisfies readonly BeliefStatement[],
    }));
    await act(() => mockActor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED }));

    const settings = await _renderLocalized(<SettingsScreen />);
    expect(settings.getByText('Manage personal core beliefs')).toBeTruthy();
    expect(settings.getByText('1')).toBeTruthy();
    await fireEvent.press(settings.getByTestId('open-belief-library'));
    expect(mockActor.getSnapshot().matches(BELIEF_LIBRARY_STATES.LIBRARY)).toBe(true);

    const library = await _renderLocalized(<BeliefLibraryScreen />);
    expect(library.getByText('CORE BELIEF · LIMITING')).toBeTruthy();
    expect(library.getByText('GUIDING BELIEF · SUPPORTIVE')).toBeTruthy();
    expect(library.getByText('I must never need help.')).toBeTruthy();
    expect(library.getByText('I can ask for support.')).toBeTruthy();
    expect(library.getByText('Add your own core belief')).toBeTruthy();
    expect(library.getByText('Write it in your own words.')).toBeTruthy();
    await fireEvent.press(library.getByTestId('belief-library-create'));
    expect(mockActor.getSnapshot().matches(BELIEF_LIBRARY_STATES.EDITOR)).toBe(true);
    expect(library.getByText('ADD CORE BELIEF')).toBeTruthy();
    expect(library.getByTestId('belief-library-harmful-card')).toBeTruthy();
    expect(library.getByTestId('belief-library-guiding-card')).toBeTruthy();
    expect(library.getByText('Your core belief')).toBeTruthy();
    expect(library.getByText('Your new guiding belief')).toBeTruthy();
    expect(library.getByTestId('belief-library-guiding-draft').props['placeholder']).toBe(
      'Write your new guiding belief here, for example: I may not function sometimes and I am still loved.',
    );
    await fireEvent.press(library.getByTestId('belief-library-guiding-help-toggle'));
    expect(library.getByTestId('belief-library-guiding-help')).toBeTruthy();
    await fireEvent.changeText(
      library.getByTestId('belief-library-harmful-draft'),
      'I must always stay strong.',
    );
    await fireEvent.changeText(
      library.getByTestId('belief-library-guiding-draft'),
      'I can let others support me.',
    );
    await fireEvent.press(library.getByTestId('belief-library-save'));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(BELIEF_LIBRARY_STATES.LIBRARY),
    ).toBe(true));
    expect(mockActor.getSnapshot().context.beliefStatements).toContainEqual(
      expect.objectContaining({
        kind: 'custom',
        harmfulStatement: 'I must always stay strong.',
        guidingStatement: 'I can let others support me.',
      }),
    );
    expect(library.getByText('I must always stay strong.')).toBeTruthy();
    expect(library.getByText('I can let others support me.')).toBeTruthy();
    await fireEvent.press(library.getByTestId(`edit-custom-belief-${beliefSystemId}`));
    expect(mockActor.getSnapshot().matches(BELIEF_LIBRARY_STATES.EDITOR)).toBe(true);
    await fireEvent.changeText(
      library.getByTestId('belief-library-harmful-draft'),
      'I may need help sometimes.',
    );
    await fireEvent.changeText(
      library.getByTestId('belief-library-guiding-draft'),
      'Support makes connection possible.',
    );
    await fireEvent.press(library.getByTestId('belief-library-save'));
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(BELIEF_LIBRARY_STATES.LIBRARY),
    ).toBe(true));
    expect(mockActor.getSnapshot().context.beliefStatements).toContainEqual({
      kind: 'custom',
      beliefSystemId,
      harmfulStatement: 'I may need help sometimes.',
      guidingStatement: 'Support makes connection possible.',
    });
    expect(library.getByText('I may need help sometimes.')).toBeTruthy();

    await fireEvent.press(library.getByTestId(`remove-custom-belief-${beliefSystemId}`));
    expect(alert).toHaveBeenLastCalledWith(
      'Remove this core belief?',
      'It will no longer appear in future suggestions. Earlier moments keep their wording.',
      expect.any(Array),
    );
    const buttons = alert.mock.calls[alert.mock.calls.length - 1]?.[2];
    const destructive = buttons?.find((button) => button.style === 'destructive');
    await act(() => destructive?.onPress?.());
    await waitFor(() => expect(
      mockActor.getSnapshot().matches(BELIEF_LIBRARY_STATES.LIBRARY),
    ).toBe(true));
    expect(library.queryByTestId(`belief-library-row-${beliefSystemId}`)).toBeNull();

    await act(() => mockActor.send({ type: BELIEF_LIBRARY_EVENTS.CLOSED }));
    expect(mockActor.getSnapshot().matches({
      [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.SETTINGS,
    })).toBe(true);
  });

  it('opens the explanation guide from Settings and returns there when skipped', async () => {
    await act(() => mockActor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED }));
    const settings = await _renderLocalized(<SettingsScreen />);

    expect(settings.getByText('UNDERSTAND YOUMOTION')).toBeTruthy();
    expect(settings.getByText('Open short guide')).toBeTruthy();
    await fireEvent.press(settings.getByTestId('open-onboarding'));

    expect(mockActor.getSnapshot().matches({
      [NAVIGATION_STATES.ONBOARDING]: ONBOARDING_STATES.WELCOME,
    })).toBe(true);
    await act(() => mockActor.send({ type: ONBOARDING_EVENTS.SKIPPED }));
    expect(mockActor.getSnapshot().matches({
      [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.SETTINGS,
    })).toBe(true);
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
    expect(reflection.getByText(
      "Next, you can add or change this moment's core belief and guiding belief. Both steps are optional.",
    )).toBeTruthy();
    expect(reflection.getByText('Save and continue')).toBeTruthy();
    expect(reflection.getByText('Change feeling')).toBeTruthy();
    expect(reflection.getByTestId('delete-edited-moment')).toBeTruthy();
    expect(useFocusEffect).toHaveBeenCalledTimes(1);
    expect(reflection.getByDisplayValue('Before').props['autoFocus']).toBeUndefined();
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
    expect(history.queryByText('Delete moment')).toBeNull();
    expect(history.queryByTestId(`delete-history-moment-${saved.id}`)).toBeNull();
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
