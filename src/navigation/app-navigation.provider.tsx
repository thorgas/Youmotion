import { useMachine } from '@xstate/react';
import { Redirect, usePathname } from 'expo-router';
import { createContext, type PropsWithChildren, useContext } from 'react';
import type { ActorRefFrom } from 'xstate';

import { appNavigationMachine, routeForStateValue } from './app-navigation.machine';

type AppNavigationActor = ActorRefFrom<typeof appNavigationMachine>;

const AppNavigationContext = createContext<AppNavigationActor | null>(null);

export function AppNavigationProvider({ children }: PropsWithChildren) {
  const [snapshot, , actor] = useMachine(appNavigationMachine);
  const pathname = usePathname();
  const route = routeForStateValue(snapshot.value);

  return (
    <AppNavigationContext.Provider value={actor}>
      {children}
      {pathname === route ? null : <Redirect href={route} />}
    </AppNavigationContext.Provider>
  );
}

export function useAppNavigationActor() {
  const actor = useContext(AppNavigationContext);
  if (!actor) throw new Error('useAppNavigationActor must be used inside AppNavigationProvider.');
  return actor;
}
