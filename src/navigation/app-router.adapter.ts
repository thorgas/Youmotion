import { router } from 'expo-router';
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

function isAppNavigationSnapshot(
  snapshot: Snapshot<unknown>,
): snapshot is AppNavigationSnapshot {
  return 'machine' in snapshot && snapshot.machine === appNavigationMachine;
}

function isAppNavigationTransition(
  event: InspectionEvent,
): event is AppNavigationTransition {
  return event.type === '@xstate.transition'
    && isAppNavigationSnapshot(event.snapshot);
}

function isTabRoute(route: AppRoute) {
  return (
    route === APP_ROUTES.TODAY
    || route === APP_ROUTES.HISTORY
    || route === APP_ROUTES.ANALYTICS
    || route === APP_ROUTES.SETTINGS
  );
}

function replaceRoute(route: AppRoute) {
  router.replace(route);
}

function dismissToRoute(route: AppRoute) {
  router.dismissTo(route);
}

function routeNameMatchesAppRoute({
  route,
  routeName,
}: {
  route: AppRoute;
  routeName: string | undefined;
}) {
  if (!routeName) return false;
  const routePath = route.slice(1);
  return routeName === routePath || routeName.endsWith(`/${routePath}`);
}

function syncNativeDismissal({
  actor,
  history,
  route,
}: {
  actor: AppNavigationActor;
  history: readonly AppRoute[];
  route: AppRoute;
}) {
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
}

function syncMachineRoute({
  actor,
  route,
}: {
  actor: AppNavigationActor;
  route: AppRoute;
}) {
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
}

export function inspectAppNavigation(event: InspectionEvent) {
  if (!isAppNavigationTransition(event)) return;
  if (event.snapshot.matches(NAVIGATION_STATES.STARTING)) return;
  syncMachineRoute({
    actor: event.actorRef,
    route: routeForStateValue(event.snapshot.value),
  });
}

export function handleNativeRouteRemoval({
  actor,
  event,
  routeName,
}: {
  actor: AppNavigationActor;
  event: { preventDefault: () => void };
  routeName: string | undefined;
}) {
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
}

export function nativeRouteTransitionEnded({
  actor,
  event,
  routeName,
}: {
  actor: AppNavigationActor;
  event: { data: { closing: boolean } };
  routeName: string | undefined;
}) {
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
}
