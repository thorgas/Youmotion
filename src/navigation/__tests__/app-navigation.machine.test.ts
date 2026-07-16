import AsyncStorage from '@react-native-async-storage/async-storage';
import { createActor, waitFor } from 'xstate';

import {
  APP_ROUTES,
  CHECK_IN_EVENTS,
  CHECK_IN_STATES,
  EMOTION_IDS,
  NAVIGATION_EVENTS,
  NAVIGATION_STATES,
} from '@/constants';
import type { EmotionSelection } from '@/features/check-in/domain/check-in';
import { appNavigationMachine, routeForStateValue } from '../app-navigation.machine';

const selection = {
  emotionId: EMOTION_IDS.JOY,
  intensity: 0.42,
  level: 2,
  color: '#E7AD32',
} satisfies EmotionSelection;

describe('app navigation model', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('makes tab navigation an explicit state graph', () => {
    const actor = createActor(appNavigationMachine).start();
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);

    actor.send({ type: NAVIGATION_EVENTS.HISTORY_OPENED });
    expect(actor.getSnapshot().matches({ [NAVIGATION_STATES.TABS]: NAVIGATION_STATES.HISTORY })).toBe(true);
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.HISTORY);

    actor.send({ type: NAVIGATION_EVENTS.SETTINGS_OPENED });
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.SETTINGS);

    actor.send({ type: NAVIGATION_EVENTS.TODAY_OPENED });
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);
  });

  it('reaches reflection only through a valid star interaction', () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);

    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    expect(actor.getSnapshot().matches({
      [NAVIGATION_STATES.TABS]: {
        [NAVIGATION_STATES.TODAY]: CHECK_IN_STATES.EXPLORING,
      },
    })).toBe(true);
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    expect(actor.getSnapshot().matches(NAVIGATION_STATES.REFLECTION)).toBe(true);
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.REFLECTION);

    actor.send({ type: CHECK_IN_EVENTS.NOTE_CHANGED, note: 'a'.repeat(300) });
    expect(actor.getSnapshot().context.note).toHaveLength(240);
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
    expect(actor.getSnapshot().matches(CHECK_IN_STATES.SAVING)).toBe(true);
  });

  it('cancels an interrupted drag without selecting its preview', () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CANCELLED });

    expect(actor.getSnapshot().matches({
      [NAVIGATION_STATES.TABS]: {
        [NAVIGATION_STATES.TODAY]: CHECK_IN_STATES.IDLE,
      },
    })).toBe(true);
    expect(actor.getSnapshot().context.selection).toBeNull();
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);
  });

  it('persists through the saving state and reaches success', async () => {
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });

    const snapshot = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.SUCCESS),
      { timeout: 1_000 },
    );

    expect(routeForStateValue(snapshot.value)).toBe(APP_ROUTES.SUCCESS);
    expect(snapshot.context.saved?.emotionId).toBe(EMOTION_IDS.JOY);
  });

  it('models a storage failure and successful retry', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage unavailable'));
    const actor = createActor(appNavigationMachine).start();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });

    await waitFor(actor, (candidate) => candidate.matches(CHECK_IN_STATES.FAILURE), { timeout: 1_000 });
    actor.send({ type: CHECK_IN_EVENTS.RETRIED });
    const snapshot = await waitFor(
      actor,
      (candidate) => candidate.matches(CHECK_IN_STATES.SUCCESS),
      { timeout: 1_000 },
    );

    expect(snapshot.context.error).toBeNull();
  });
});
