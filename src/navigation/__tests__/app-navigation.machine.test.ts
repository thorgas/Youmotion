import { createActor } from 'xstate';

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
  emotion: 'Freude',
  nuance: 'Fröhlichkeit',
  intensity: 0.42,
  level: 2,
  color: '#E7AD32',
} satisfies EmotionSelection;

describe('app navigation model', () => {
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
    actor.send({ type: CHECK_IN_EVENTS.SELECTION_RELEASED });
    expect(actor.getSnapshot().matches(NAVIGATION_STATES.REFLECTION)).toBe(true);
    expect(routeForStateValue(actor.getSnapshot().value)).toBe(APP_ROUTES.REFLECTION);

    actor.send({ type: CHECK_IN_EVENTS.NOTE_CHANGED, note: 'a'.repeat(300) });
    expect(actor.getSnapshot().context.note).toHaveLength(240);
    actor.send({ type: CHECK_IN_EVENTS.CONFIRMED });
    expect(actor.getSnapshot().matches(CHECK_IN_STATES.SAVING)).toBe(true);
  });
});
