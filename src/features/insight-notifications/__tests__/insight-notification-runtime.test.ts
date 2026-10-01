import { AppState, type AppStateStatus } from 'react-native';
import { APP_LOCALES, REMINDER_PERMISSION_STATES } from '@/constants';
import type { InsightData, InsightDependencies } from '../application/insight-notification-coordinator';
import { createInsightNotificationRuntime } from '../application/insight-notification-runtime';
import { createInsightNotificationStore } from '../application/insight-notification.store';
import { initialInsightNotificationState } from '../domain/insight-notification';

const settle = () => new Promise<void>((resolve) => { setTimeout(resolve, 0); });

const noop = () => undefined;

function runtimeRig() {
  let data: InsightData = { entries: [], statements: [], locale: APP_LOCALES.ENGLISH, ready: false };
  let saved = { ...initialInsightNotificationState(), enabled: true };
  let now = new Date('2026-10-01T10:00:00.000Z');
  let notify: () => void = noop;
  let stop: () => void = noop;
  let activity: (state: AppStateStatus) => void = noop;
  const unsubscribe = jest.fn();
  const remove = jest.fn();
  const deps: InsightDependencies = {
    load: jest.fn(async () => saved),
    persist: jest.fn(async (settings) => { saved = settings; }),
    permission: jest.fn(async () => REMINDER_PERMISSION_STATES.GRANTED),
    requestPermission: jest.fn(async () => REMINDER_PERMISSION_STATES.GRANTED),
    reconcile: jest.fn(async () => undefined),
    cancel: jest.fn(async () => undefined),
    now: jest.fn(() => now),
    nonce: jest.fn(() => 'runtime-test'),
    openSettings: jest.fn(async () => undefined),
  };
  const appState = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    activity = listener;
    return { remove };
  });
  const store = createInsightNotificationStore();
  const runtime = createInsightNotificationRuntime({ store, deps });
  runtime.start({
    data: () => data,
    subscribe: (listener) => { notify = listener; return { unsubscribe }; },
    onStop: (listener) => { stop = listener; },
  });
  return {
    deps, store, unsubscribe, remove, appState,
    notify: () => { notify(); },
    stop: () => { stop(); },
    activity: (state: AppStateStatus) => { activity(state); },
    setData: (value: InsightData) => { data = value; },
    data: () => data,
    setNow: (value: Date) => { now = value; },
  };
}

afterEach(() => { jest.restoreAllMocks(); });

describe('insight notification runtime consumer lifecycle', () => {
  it('waits for ready binding data, hydrates once, and skips unchanged references', async () => {
    const rig = runtimeRig();
    rig.activity('active');
    await settle();
    expect(rig.deps.load).not.toHaveBeenCalled();
    expect(rig.store.getSnapshot().context.hydrated).toBe(false);
    rig.setData({ ...rig.data(), ready: true });
    rig.notify();
    await settle();
    expect(rig.deps.load).toHaveBeenCalledTimes(1);
    expect(rig.store.getSnapshot().context.hydrated).toBe(true);
    expect(rig.deps.reconcile).toHaveBeenCalledTimes(1);
    rig.setData({ ...rig.data() });
    rig.notify();
    await settle();
    expect(rig.deps.permission).toHaveBeenCalledTimes(1);
    expect(rig.deps.reconcile).toHaveBeenCalledTimes(1);
    rig.stop();
  });

  it('reevaluates on foreground reentry with a new clock despite unchanged data references', async () => {
    const rig = runtimeRig();
    rig.activity('active');
    rig.setData({ ...rig.data(), ready: true });
    rig.notify();
    await settle();
    expect(rig.deps.reconcile).toHaveBeenCalledTimes(1);
    rig.activity('background');
    rig.setNow(new Date('2026-10-02T10:00:00.000Z'));
    rig.notify();
    await settle();
    expect(rig.deps.reconcile).toHaveBeenCalledTimes(1);
    rig.activity('active');
    await settle();
    expect(rig.deps.reconcile).toHaveBeenCalledTimes(2);
    expect(rig.deps.now).toHaveLastReturnedWith(new Date('2026-10-02T10:00:00.000Z'));
    rig.stop();
  });

  it('stores changed background data without evaluating until the app becomes active', async () => {
    const rig = runtimeRig();
    rig.activity('background');
    rig.setData({ ...rig.data(), entries: [], ready: true });
    rig.notify();
    await settle();
    expect(rig.deps.load).not.toHaveBeenCalled();
    expect(rig.deps.reconcile).not.toHaveBeenCalled();
    rig.activity('active');
    await settle();
    expect(rig.deps.load).toHaveBeenCalledTimes(1);
    expect(rig.deps.reconcile).toHaveBeenCalledTimes(1);
    rig.stop();
  });

  it('unsubscribes both listeners and makes a late binding callback unable to evaluate', async () => {
    const rig = runtimeRig();
    rig.activity('active');
    rig.setData({ ...rig.data(), ready: true });
    rig.notify();
    await settle();
    rig.stop();
    expect(rig.unsubscribe).toHaveBeenCalledTimes(1);
    expect(rig.remove).toHaveBeenCalledTimes(1);
    rig.setData({ ...rig.data(), entries: [] });
    rig.notify();
    await settle();
    expect(rig.deps.reconcile).toHaveBeenCalledTimes(1);
  });
});
