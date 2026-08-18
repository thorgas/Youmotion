import { getPathsFromEvents, toDirectedGraph } from 'xstate/graph';
import type {
  EventFromLogic,
  InputFrom,
  StateFrom,
  StateValue,
} from 'xstate';

import {
  APP_LOCALES,
  APP_ROUTES,
  BELIEF_LIBRARY_STATES,
  CHECK_IN_STATES,
  DATA_SAFETY_STATES,
  EMOTION_LABEL_MODES,
  NAVIGATION_EVENTS,
  NAVIGATION_STATES,
  ONBOARDING_EVENTS,
  ONBOARDING_STATES,
  REMINDER_STATES,
} from '@/constants';
import { appSettingsStore } from '@/features/settings/application/app-settings.store';
import {
  appNavigationMachine,
  routeForStateValue,
} from '../app-navigation.machine';

type AppRoute = typeof APP_ROUTES[keyof typeof APP_ROUTES];
type DirectedGraph = ReturnType<typeof toDirectedGraph>;

const EXPECTED_ROUTE_BY_LEAF_STATE = Object.freeze({
  'appNavigation.starting': APP_ROUTES.TODAY,
  [`appNavigation.${NAVIGATION_STATES.ONBOARDING}.${ONBOARDING_STATES.WELCOME}`]: APP_ROUTES.ONBOARDING,
  [`appNavigation.${NAVIGATION_STATES.ONBOARDING}.${ONBOARDING_STATES.PULSE}`]: APP_ROUTES.ONBOARDING_PULSE,
  [`appNavigation.${NAVIGATION_STATES.ONBOARDING}.${ONBOARDING_STATES.EXAMPLE}`]: APP_ROUTES.ONBOARDING_EXAMPLE,
  [`appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.TODAY}.${CHECK_IN_STATES.IDLE}`]: APP_ROUTES.TODAY,
  [`appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.TODAY}.${CHECK_IN_STATES.EXPLORING}`]: APP_ROUTES.TODAY,
  [`appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.HISTORY}`]: APP_ROUTES.HISTORY,
  [`appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.ANALYTICS}`]: APP_ROUTES.ANALYTICS,
  [`appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.SETTINGS}.${DATA_SAFETY_STATES.IDLE}`]: APP_ROUTES.SETTINGS,
  [`appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.SETTINGS}.${DATA_SAFETY_STATES.EXPORTING}`]: APP_ROUTES.SETTINGS,
  [`appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.SETTINGS}.${DATA_SAFETY_STATES.PICKING_ARCHIVE}`]: APP_ROUTES.SETTINGS,
  [`appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.SETTINGS}.${DATA_SAFETY_STATES.RESTORE_PREVIEW}`]: APP_ROUTES.SETTINGS,
  [`appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.SETTINGS}.${DATA_SAFETY_STATES.RESTORING}`]: APP_ROUTES.SETTINGS,
  [`appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.SETTINGS}.${DATA_SAFETY_STATES.DELETE_CONFIRMATION}`]: APP_ROUTES.SETTINGS,
  [`appNavigation.${NAVIGATION_STATES.TABS}.${NAVIGATION_STATES.SETTINGS}.${DATA_SAFETY_STATES.DELETING}`]: APP_ROUTES.SETTINGS,
  [`appNavigation.${NAVIGATION_STATES.REFLECTION}`]: APP_ROUTES.REFLECTION,
  [`appNavigation.${CHECK_IN_STATES.SAVING}`]: APP_ROUTES.REFLECTION,
  [`appNavigation.${CHECK_IN_STATES.BELIEF_SYSTEM}`]: APP_ROUTES.BELIEF_SYSTEM,
  [`appNavigation.${CHECK_IN_STATES.BELIEF_SYSTEM_CATALOG}`]: APP_ROUTES.BELIEF_SYSTEM_CATALOG,
  [`appNavigation.${CHECK_IN_STATES.BELIEF_SYSTEM_EDITOR}`]: APP_ROUTES.BELIEF_SYSTEM_EDITOR,
  [`appNavigation.${CHECK_IN_STATES.PERSISTING_BELIEF_STATEMENT}`]: APP_ROUTES.BELIEF_SYSTEM_EDITOR,
  [`appNavigation.${CHECK_IN_STATES.BELIEF_STATEMENT_FAILURE}`]: APP_ROUTES.BELIEF_SYSTEM_EDITOR,
  [`appNavigation.${CHECK_IN_STATES.ATTACHING_BELIEF_SYSTEM}`]: APP_ROUTES.BELIEF_SYSTEM,
  [`appNavigation.${CHECK_IN_STATES.BELIEF_SYSTEM_FAILURE}`]: APP_ROUTES.BELIEF_SYSTEM,
  [`appNavigation.${CHECK_IN_STATES.GUIDING_BELIEF}`]: APP_ROUTES.GUIDING_BELIEF,
  [`appNavigation.${CHECK_IN_STATES.PERSISTING_GUIDING_BELIEF}`]: APP_ROUTES.GUIDING_BELIEF,
  [`appNavigation.${CHECK_IN_STATES.GUIDING_BELIEF_FAILURE}`]: APP_ROUTES.GUIDING_BELIEF,
  [`appNavigation.${CHECK_IN_STATES.SUCCESS}`]: APP_ROUTES.SUCCESS,
  [`appNavigation.${CHECK_IN_STATES.FAILURE}`]: APP_ROUTES.REFLECTION,
  [`appNavigation.${BELIEF_LIBRARY_STATES.LIBRARY}`]: APP_ROUTES.BELIEF_LIBRARY,
  [`appNavigation.${BELIEF_LIBRARY_STATES.EDITOR}`]: APP_ROUTES.BELIEF_LIBRARY_EDITOR,
  [`appNavigation.${BELIEF_LIBRARY_STATES.SAVING}`]: APP_ROUTES.BELIEF_LIBRARY_EDITOR,
  [`appNavigation.${BELIEF_LIBRARY_STATES.RETIRING}`]: APP_ROUTES.BELIEF_LIBRARY,
  [`appNavigation.${REMINDER_STATES.SETTINGS}`]: APP_ROUTES.REMINDERS,
  [`appNavigation.${REMINDER_STATES.CHECKING_PERMISSION}`]: APP_ROUTES.LEITSATZ_REMINDER,
  [`appNavigation.${REMINDER_STATES.OFFER}`]: APP_ROUTES.LEITSATZ_REMINDER,
  [`appNavigation.${REMINDER_STATES.REQUESTING_PERMISSION}`]: APP_ROUTES.LEITSATZ_REMINDER,
  [`appNavigation.${REMINDER_STATES.PERMISSION_DENIED}`]: APP_ROUTES.LEITSATZ_REMINDER,
  [`appNavigation.${REMINDER_STATES.EDITOR}`]: APP_ROUTES.LEITSATZ_REMINDER,
  [`appNavigation.${REMINDER_STATES.SAVING}`]: APP_ROUTES.LEITSATZ_REMINDER,
  [`appNavigation.${REMINDER_STATES.ACTIVE}`]: APP_ROUTES.LEITSATZ_REMINDER,
  [`appNavigation.${REMINDER_STATES.GUIDING_BELIEF}`]: APP_ROUTES.LEITSATZ_REMINDER,
}) satisfies Readonly<Record<string, AppRoute>>;

function leafGraphs(graph: DirectedGraph): readonly DirectedGraph[] {
  if (graph.children.length === 0) return [graph];
  return graph.children.flatMap(leafGraphs);
}

function stateValueForPath(path: readonly string[]): StateValue {
  const [state, ...children] = path;
  if (!state) throw new Error('A navigation state path cannot be empty.');
  if (children.length === 0) return state;
  return { [state]: stateValueForPath(children) };
}

describe('app navigation graph', () => {
  beforeEach(() => {
    appSettingsStore.trigger.hydrated({
      settings: {
        locale: APP_LOCALES.ENGLISH,
        emotionLabelMode: EMOTION_LABEL_MODES.EMOJI,
        onboardingCompleted: true,
      },
    });
  });

  it('projects every declared leaf state onto an explicit mapped route', () => {
    const leaves = leafGraphs(toDirectedGraph(appNavigationMachine));
    const leafIds = leaves.map(({ id }) => id).toSorted();
    const expectedIds = Object.keys(EXPECTED_ROUTE_BY_LEAF_STATE).toSorted();

    expect(leafIds).toEqual(expectedIds);
    leaves.forEach(({ id, stateNode }) => {
      expect(routeForStateValue(stateValueForPath(stateNode.path))).toBe(
        EXPECTED_ROUTE_BY_LEAF_STATE[id],
      );
    });
    expect(new Set(Object.values(EXPECTED_ROUTE_BY_LEAF_STATE))).toEqual(
      new Set(Object.values(APP_ROUTES)),
    );
  });

  it('keeps the mapped onboarding replay inside its expected route sequence', () => {
    const [path] = getPathsFromEvents<
      StateFrom<typeof appNavigationMachine>,
      EventFromLogic<typeof appNavigationMachine>,
      InputFrom<typeof appNavigationMachine>
    >(appNavigationMachine, [
        { type: NAVIGATION_EVENTS.SETTINGS_OPENED },
        { type: ONBOARDING_EVENTS.OPENED },
        { type: ONBOARDING_EVENTS.NEXT_REQUESTED },
        { type: ONBOARDING_EVENTS.EXAMPLE_REQUESTED },
        { type: ONBOARDING_EVENTS.NEXT_REQUESTED },
        { type: ONBOARDING_EVENTS.FINISHED },
      ]);

    expect(path?.steps.map(({ state }) => routeForStateValue(state.value))).toEqual([
      APP_ROUTES.TODAY,
      APP_ROUTES.SETTINGS,
      APP_ROUTES.ONBOARDING,
      APP_ROUTES.ONBOARDING_PULSE,
      APP_ROUTES.ONBOARDING_PULSE,
      APP_ROUTES.ONBOARDING_EXAMPLE,
      APP_ROUTES.SETTINGS,
    ]);
  });

  it('rejects an unmodeled route state instead of silently opening Today', () => {
    expect(() => routeForStateValue('unexpected')).toThrow(
      'Unhandled app navigation state: "unexpected"',
    );
  });
});
