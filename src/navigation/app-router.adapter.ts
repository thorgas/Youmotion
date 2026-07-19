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
const programmaticDismissals = new WeakSet<AppNavigationActor>();

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
    || route === APP_ROUTES.SETTINGS
  );
}

function replaceRoute({
  actor,
  route,
}: {
  actor: AppNavigationActor;
  route: AppRoute;
}) {
  programmaticDismissals.add(actor);
  router.replace(route);
}

function dismissToRoute({
  actor,
  route,
}: {
  actor: AppNavigationActor;
  route: AppRoute;
}) {
  programmaticDismissals.add(actor);
  router.dismissTo(route);
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
    replaceRoute({ actor, route });
    routeHistory.set(actor, [route]);
    return;
  }

  routeHistory.set(actor, history.slice(0, routeIndex + 1));
  if (routeIndex === history.length - 2) return;
  dismissToRoute({ actor, route });
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
    router.replace(route);
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
    router.replace(route);
    return;
  }

  const routeIndex = history.lastIndexOf(route);
  if (routeIndex >= 0) {
    routeHistory.set(actor, history.slice(0, routeIndex + 1));
    dismissToRoute({ actor, route });
    return;
  }

  if (isTabRoute(route)) {
    routeHistory.set(actor, [route]);
    replaceRoute({ actor, route });
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

export function preventUnavailableNativeBack({
  actor,
  event,
}: {
  actor: AppNavigationActor;
  event: { preventDefault: () => void };
}) {
  if (programmaticDismissals.has(actor)) return;
  if (actor.getSnapshot().can({ type: NAVIGATION_EVENTS.BACK_REQUESTED })) return;
  event.preventDefault();
}

export function nativeRouteTransitionEnded({
  actor,
  event,
}: {
  actor: AppNavigationActor;
  event: { data: { closing: boolean } };
}) {
  if (!event.data.closing) return;
  if (programmaticDismissals.delete(actor)) return;

  const snapshot = actor.getSnapshot();
  if (!snapshot.can({ type: NAVIGATION_EVENTS.BACK_REQUESTED })) {
    router.push(routeForStateValue(snapshot.value));
    return;
  }

  nativeDismissals.add(actor);
  actor.send({ type: NAVIGATION_EVENTS.BACK_REQUESTED });
}
