import { router } from 'expo-router';
import { createActor } from 'xstate';

import {
  APP_LOCALES,
  APP_ROUTES,
  CHECK_IN_EVENTS,
  EMOTION_IDS,
  EMOTION_LABEL_MODES,
  NAVIGATION_EVENTS,
} from '@/constants';
import type { EmotionSelection } from '@/features/check-in/domain/check-in';
import { emotions } from '@/features/check-in/domain/emotion';
import { appSettingsStore } from '@/app-stores';
import {
  mockSurrealDatabase,
  resetSurrealDatabaseMock,
} from '@/test-utils/surrealdb.repository.mock';
import { appNavigationMachine } from '../app-navigation.composition';
import { routeForStateValue } from '../app-navigation.machine';
import {
  handleNativeRouteRemoval,
  inspectAppNavigation,
  nativeRouteTransitionEnded,
} from '../app-router.adapter';

jest.mock('expo-router', () => ({
  router: {
    dismissTo: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

const mockRouter = jest.mocked(router);

jest.mock('@/infrastructure/database/surrealdb.database', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockSurrealDatabase)),
  queryDatabase: jest.fn(({ surql, variables }: {
    surql: string;
    variables?: Parameters<typeof mockSurrealDatabase.query>[1];
  }) => variables === undefined
    ? mockSurrealDatabase.query(surql)
    : mockSurrealDatabase.query(surql, variables)),
}));

const joyEmotion = emotions.find(({ id }) => id === EMOTION_IDS.JOY);
if (!joyEmotion) throw new Error('The joy emotion fixture must exist.');

const selection = {
  emotionId: EMOTION_IDS.JOY,
  intensity: 0.42,
  level: 2,
  color: joyEmotion.color,
} satisfies EmotionSelection;

function startNavigationActor() {
  return createActor(appNavigationMachine, {
    inspect: inspectAppNavigation,
  }).start();
}

describe('app router adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSurrealDatabaseMock();
    appSettingsStore.trigger.hydrated({
      settings: {
        locale: APP_LOCALES.ENGLISH,
        emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
        onboardingCompleted: true,
      },
    });
  });

  it('mirrors forward and button-back machine transitions with native stack actions', () => {
    const actor = startNavigationActor();
    expect(mockRouter.replace).toHaveBeenCalledWith(APP_ROUTES.TODAY);

    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    expect(mockRouter.push).toHaveBeenCalledWith(APP_ROUTES.REFLECTION);

    actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
    expect(mockRouter.dismissTo).toHaveBeenCalledWith(APP_ROUTES.TODAY);
  });

  it('replaces one tab route with the Analytics tab route', () => {
    const actor = startNavigationActor();
    jest.clearAllMocks();

    actor.send({ type: NAVIGATION_EVENTS.ANALYTICS_OPENED });

    expect(mockRouter.replace).toHaveBeenCalledWith(APP_ROUTES.ANALYTICS);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('lets a completed native dismissal drive the machine without dismissing twice', () => {
    const actor = startNavigationActor();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    jest.clearAllMocks();

    nativeRouteTransitionEnded({
      actor,
      event: { data: { closing: true } },
      routeName: 'reflection',
    });

    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);
    expect(actor.getSnapshot().context.selection).toBeNull();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('prevents native dismissal while the current machine state cannot go back', () => {
    const actor = startNavigationActor();
    const preventDefault = jest.fn();

    handleNativeRouteRemoval({
      actor,
      event: { preventDefault },
      routeName: '(tabs)/today',
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('allows the initial programmatic replacement to remove the index route', () => {
    const actor = startNavigationActor();
    const preventDefault = jest.fn();

    handleNativeRouteRemoval({
      actor,
      event: { preventDefault },
      routeName: 'index',
    });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('synchronizes native back before Android removes the route', () => {
    const actor = startNavigationActor();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    jest.clearAllMocks();

    const preventDefault = jest.fn();
    handleNativeRouteRemoval({
      actor,
      event: { preventDefault },
      routeName: 'reflection',
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);
    expect(actor.getSnapshot().context.selection).toBeNull();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();

    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    expect(mockRouter.push).toHaveBeenCalledWith(APP_ROUTES.REFLECTION);

    handleNativeRouteRemoval({
      actor,
      event: { preventDefault },
      routeName: 'reflection',
    });
    actor.send({ type: NAVIGATION_EVENTS.HISTORY_OPENED });
    expect(mockRouter.replace).toHaveBeenCalledWith(APP_ROUTES.HISTORY);
  });

  it('ignores the closing transition from a machine-driven dismissal', () => {
    const actor = startNavigationActor();
    actor.send({ type: CHECK_IN_EVENTS.TOUCH_STARTED });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_CHANGED, selection });
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });

    nativeRouteTransitionEnded({
      actor,
      event: { data: { closing: true } },
      routeName: 'reflection',
    });

    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.TODAY);
  });
});
