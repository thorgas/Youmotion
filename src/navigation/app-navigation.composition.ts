import { appSettingsStore, checkInHistoryStore } from '@/app-stores';
import { createAppNavigationMachine } from './app-navigation.machine';

const systemNavigationRuntime = {
  appSettingsStore,
  checkInHistoryStore,
  nonce: () => Math.random().toString(16).slice(2),
  now: () => new Date(),
};

export const appNavigationMachine = createAppNavigationMachine(systemNavigationRuntime);
