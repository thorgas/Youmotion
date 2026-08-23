import { useMachine } from '@xstate/react';
import { createContext, type PropsWithChildren, useContext } from 'react';
import assert from '@/assert';
import type { ActorRefFrom } from 'xstate';

import { appNavigationMachine } from './app-navigation.machine';
import { inspectAppNavigation } from './app-router.adapter';

export type AppNavigationActor = ActorRefFrom<typeof appNavigationMachine>;

const AppNavigationContext = createContext<AppNavigationActor | null>(null);

export function AppNavigationActorProvider({
  actor,
  children,
}: PropsWithChildren<{ actor: AppNavigationActor }>) {
  return (
    <AppNavigationContext.Provider value={actor}>
      {children}
    </AppNavigationContext.Provider>
  );
}

export function AppNavigationProvider({ children }: PropsWithChildren) {
  const [, , actor] = useMachine(appNavigationMachine, {
    inspect: inspectAppNavigation,
  });

  return (
    <AppNavigationContext.Provider value={actor}>
      {children}
    </AppNavigationContext.Provider>
  );
}

export function useAppNavigationActor() {
  const actor = useContext(AppNavigationContext);
  assert(actor, 'useAppNavigationActor must be used inside AppNavigationProvider.');
  assert(actor.getSnapshot().status !== 'stopped', 'Navigation actor must be active.');
  return actor;
}
