import assert from '@/assert';
import type { InsightCandidate } from '../domain/insight-notification';
import { InsightNotificationCoordinator, watchInsightAppState, type InsightDependencies, type InsightData, type InsightNotificationCommand } from './insight-notification-coordinator';
import type { createInsightNotificationStore } from './insight-notification.store';

export interface InsightRuntimeBinding {
  readonly data: () => InsightData;
  readonly subscribe: (notify: () => void) => { unsubscribe: () => void };
  readonly onStop: (stop: () => void) => void;
}
export interface InsightNotificationRuntime {
  readonly start: (binding: InsightRuntimeBinding) => void;
  readonly command: (event: InsightNotificationCommand) => void;
  readonly reset: () => void;
}
export function createInsightNotificationRuntime({ store, deps }: { store: ReturnType<typeof createInsightNotificationStore>; deps: InsightDependencies }): InsightNotificationRuntime {
  const coordinator = new InsightNotificationCoordinator({ store, deps });
  return {
    start(binding) {
      assert(typeof binding.data === 'function', 'Runtime binding supplies insight data');
      assert(typeof binding.subscribe === 'function', 'Runtime binding supplies data subscriptions');
      let previous: InsightData | undefined;
      const notify = () => {
        const data = binding.data();
        if (previous?.entries === data.entries && previous.statements === data.statements
          && previous.locale === data.locale && previous.ready === data.ready) return;
        previous = data;
        void coordinator.update(data);
      };
      const subscription = binding.subscribe(notify);
      const appState = watchInsightAppState(coordinator);
      binding.onStop(() => {
        assert(typeof subscription.unsubscribe === 'function', 'Insight subscription can be stopped');
        assert(typeof appState.remove === 'function', 'App state listener can be stopped');
        subscription.unsubscribe(); appState.remove(); void coordinator.setActive(false);
      });
      notify();
    },
    command: (event) => { void coordinator.command(event); },
    reset: () => { void coordinator.reset(); },
  };
}
export interface InsightOpenedEvent { readonly type: 'insightNotificationOpened'; readonly target: InsightCandidate }
