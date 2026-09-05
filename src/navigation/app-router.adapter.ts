import { router } from 'expo-router';
import assert from '@/assert';
import type {
  ActorRefFrom,
  InspectionEvent,
  Snapshot,
  StateFrom,
} from 'xstate';

import {
  APP_ROUTES,
  NAVIGATION_EVENTS,
  NAVIGATION_STATES,
} from '@/constants';
import {
  appNavigationMachine,
  routeForStateValue,
} from './app-navigation.machine';
import { bindReminderNotificationActor } from '@/features/reminders/infrastructure/reminder-notification.bridge';

type AppNavigationActor = ActorRefFrom<typeof appNavigationMachine>;
type AppNavigationSnapshot = StateFrom<typeof appNavigationMachine>;
type AppRoute = typeof APP_ROUTES[keyof typeof APP_ROUTES];
type AppNavigationTransition = Extract<
  InspectionEvent,
  { type: '@xstate.transition' }
> & {
  actorRef: AppNavigationActor;
  snapshot: AppNavigationSnapshot;
};

const routeHistory = new WeakMap<AppNavigationActor, readonly AppRoute[]>();
const nativeDismissals = new WeakSet<AppNavigationActor>();

const isAppNavigationSnapshot = (
  snapshot: Snapshot<unknown>,
): snapshot is AppNavigationSnapshot => {
  assert(typeof snapshot === 'object' && snapshot !== null, 'Navigation snapshot must be an object.');
  return 'machine' in snapshot && snapshot.machine === appNavigationMachine;
};

const isAppNavigationTransition = (
  event: InspectionEvent,
): event is AppNavigationTransition => {
  assert(typeof event.type === 'string', 'Navigation event type must be a string.');
  return event.type === '@xstate.transition'
    && isAppNavigationSnapshot(event.snapshot);
};

const isTabRoute = (route: AppRoute) => {
  assert(route.startsWith('/'), 'Tab route matching requires an absolute app route.');
  return (
    route === APP_ROUTES.TODAY
    || route === APP_ROUTES.HISTORY
    || route === APP_ROUTES.ANALYTICS
    || route === APP_ROUTES.SETTINGS
  );
};

const replaceRoute = (route: AppRoute) => {
  router.replace(route);
};

const dismissToRoute = (route: AppRoute) => {
  router.dismissTo(route);
};

const routeNameMatchesAppRoute = ({
  route,
  routeName,
}: {
  route: AppRoute;
  routeName: string | undefined;
}) => {
  assert(route.startsWith('/'), 'Route matching requires an absolute app route.');
  assert(routeName === undefined || routeName === routeName.trim(), 'Native route names cannot contain outer whitespace.');
  if (!routeName) return false;
  const routePath = route.slice(1);
  return routeName === routePath || routeName.endsWith(`/${routePath}`);
};

const syncNativeDismissal = ({
  actor,
  history,
  route,
}: {
  actor: AppNavigationActor;
  history: readonly AppRoute[];
  route: AppRoute;
}) => {
  assert(history.length > 0, 'Native dismissal requires route history.');
  assert(route.startsWith('/'), 'Native dismissal requires an absolute app route.');
  nativeDismissals.delete(actor);
  const routeIndex = history.lastIndexOf(route);
  if (routeIndex < 0) {
    replaceRoute(route);
    routeHistory.set(actor, [route]);
    return;
  }

  routeHistory.set(actor, history.slice(0, routeIndex + 1));
  if (routeIndex === history.length - 2) return;
  dismissToRoute(route);
};

const syncMachineRoute = ({
  actor,
  route,
}: {
  actor: AppNavigationActor;
  route: AppRoute;
}) => {
  assert(actor.getSnapshot().status !== 'stopped', 'Cannot sync a stopped navigation actor.');
  assert(route.startsWith('/'), 'Machine route must be an absolute app route.');
  const history = routeHistory.get(actor);
  if (!history) {
    routeHistory.set(actor, [route]);
    replaceRoute(route);
    return;
  }

  const currentRoute = history.at(-1);
  if (currentRoute === route) return;

  if (nativeDismissals.has(actor)) {
    syncNativeDismissal({ actor, history, route });
    return;
  }

  if (isTabRoute(route) && currentRoute && isTabRoute(currentRoute)) {
    routeHistory.set(actor, [route]);
    replaceRoute(route);
    return;
  }

  const routeIndex = history.lastIndexOf(route);
  if (routeIndex >= 0) {
    routeHistory.set(actor, history.slice(0, routeIndex + 1));
    dismissToRoute(route);
    return;
  }

  if (isTabRoute(route)) {
    routeHistory.set(actor, [route]);
    replaceRoute(route);
    return;
  }

  routeHistory.set(actor, [...history, route]);
  router.push(route);
};

export const inspectAppNavigation = (event: InspectionEvent) => {
  assert(event.type.startsWith('@xstate.'), 'Navigation inspection requires an XState event.');
  assert('actorRef' in event, 'Navigation inspection requires an actor reference.');
  if (!isAppNavigationTransition(event)) return;
  bindReminderNotificationActor(event.actorRef);
  if (event.snapshot.matches(NAVIGATION_STATES.STARTING)) return;
  syncMachineRoute({
    actor: event.actorRef,
    route: routeForStateValue(event.snapshot.value),
  });
};

export const handleNativeRouteRemoval = ({
  actor,
  event,
  routeName,
}: {
  actor: AppNavigationActor;
  event: { preventDefault: () => void };
  routeName: string | undefined;
}) => {
  assert(actor.getSnapshot().status !== 'stopped', 'Cannot remove a route from a stopped actor.');
  assert(routeName === undefined || routeName.length > 0, 'A native route name cannot be empty.');
  const snapshot = actor.getSnapshot();
  if (!routeNameMatchesAppRoute({
    route: routeForStateValue(snapshot.value),
    routeName,
  })) return;
  if (!snapshot.can({ type: NAVIGATION_EVENTS.BACK_REQUESTED })) {
    event.preventDefault();
    return;
  }

  nativeDismissals.add(actor);
  actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
};

export const nativeRouteTransitionEnded = ({
  actor,
  event,
  routeName,
}: {
  actor: AppNavigationActor;
  event: { data: { closing: boolean } };
  routeName: string | undefined;
}) => {
  assert(actor.getSnapshot().status !== 'stopped', 'Cannot finish a transition for a stopped actor.');
  assert(routeName === undefined || routeName.length > 0, 'A native route name cannot be empty.');
  if (!event.data.closing) return;

  const snapshot = actor.getSnapshot();
  if (!routeNameMatchesAppRoute({
    route: routeForStateValue(snapshot.value),
    routeName,
  })) return;
  if (!snapshot.can({ type: NAVIGATION_EVENTS.BACK_REQUESTED })) {
    router.push(routeForStateValue(snapshot.value));
    return;
  }

  nativeDismissals.add(actor);
  actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
};
