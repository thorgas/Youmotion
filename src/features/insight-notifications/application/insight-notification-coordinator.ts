import assert from '@/assert';
import * as Schema from 'effect/Schema';
import { AppState } from 'react-native';
import { INSIGHT_NOTIFICATION_EVENTS, INSIGHT_NOTIFICATION_OWNER, REMINDER_PERMISSION_STATES } from '@/constants';
import type { BeliefStatement } from '@/features/beliefs/domain/belief-statement';
import type { CheckIn } from '@/features/check-in/domain/check-in';
import type { AppLocale } from '@/localization/app-locale';
import type { ReminderLocalTime } from '@/features/reminders/domain/reminder-timing';
import { getReminderPermission, requestReminderPermission } from '@/features/reminders/infrastructure/local-reminder.scheduler';
import { loadInsightNotificationState, persistInsightNotificationState } from '../infrastructure/insight-notification.repository';
import { reconcileInsightBatch, cancelInsightNotifications } from '../infrastructure/insight-notification.scheduler';
import { insightCandidates, reconciledInsightDelivery, nextInsightDelivery, pendingInsightCandidates, InsightNotificationStateSchema, type InsightNotificationState } from '../domain/insight-notification';
import { createInsightNotificationStore } from './insight-notification.store';

export type InsightNotificationCommand =
  | { type: typeof INSIGHT_NOTIFICATION_EVENTS.ENABLED }
  | { type: typeof INSIGHT_NOTIFICATION_EVENTS.DISABLED }
  | { type: typeof INSIGHT_NOTIFICATION_EVENTS.DISMISSED }
  | { type: typeof INSIGHT_NOTIFICATION_EVENTS.RECHECK_REQUESTED }
  | { type: typeof INSIGHT_NOTIFICATION_EVENTS.SYSTEM_SETTINGS_REQUESTED }
  | { type: typeof INSIGHT_NOTIFICATION_EVENTS.TIME_CHANGED; time: ReminderLocalTime }
  | { type: typeof INSIGHT_NOTIFICATION_EVENTS.PICKER_CHANGED; open: boolean };
export interface InsightData {
  readonly entries: ReadonlyArray<CheckIn>; readonly statements: ReadonlyArray<BeliefStatement>; readonly locale: AppLocale; readonly ready: boolean;
}
export interface InsightDependencies {
  readonly load: typeof loadInsightNotificationState; readonly persist: typeof persistInsightNotificationState;
  readonly permission: typeof getReminderPermission; readonly requestPermission: typeof requestReminderPermission;
  readonly reconcile: typeof reconcileInsightBatch; readonly cancel: typeof cancelInsightNotifications;
  readonly now: () => Date; readonly nonce: () => string; readonly openSettings: () => Promise<void>;
}

export class InsightNotificationCoordinator {
  private queue: Promise<void> = Promise.resolve();
  private loaded = false;
  private resetting = false;
  private data: InsightData | null = null;
  private active = true;
  private readonly store: ReturnType<typeof createInsightNotificationStore>;
  private readonly deps: InsightDependencies;
  constructor({ store, deps }: { store: ReturnType<typeof createInsightNotificationStore>; deps: InsightDependencies }) {
    this.store = store; this.deps = deps;
  }

  private enqueue(task: () => Promise<void>) {
    assert(typeof task === 'function', 'Notification queue receives an executable task');
    const run = async () => {
      assert(Schema.is(InsightNotificationStateSchema)(this.store.getSnapshot().context.settings), 'Queued work starts from valid notification preferences');
      this.store.trigger.busyChanged({ busy: true });
      assert(this.store.getSnapshot().context.busy, 'Queued notification work is marked busy');
      try { await task(); }
      catch { this.store.trigger.failed({ message: 'Insight notifications could not be updated. Try again.' }); }
      finally { this.store.trigger.busyChanged({ busy: false }); }
    };
    this.queue = this.queue.then(run);
    assert(this.queue instanceof Promise, 'Notification queue remains asynchronous');
    return this.queue;
  }
  private async load() {
    if (this.loaded) return;
    const state = await this.deps.load();
    assert(Schema.is(InsightNotificationStateSchema)(state), 'Loaded insight settings match their persisted schema');
    this.store.trigger.updated({ settings: state });
    this.loaded = true;
    assert(this.store.getSnapshot().context.hydrated, 'Loaded settings mark the store hydrated');
  }
  private async save(settings: InsightNotificationState) {
    await this.deps.persist(settings);
    this.store.trigger.updated({ settings });
  }
  update(data: InsightData) {
    assert(Array.isArray(data.entries), 'Insight input includes an entry collection');
    assert(Array.isArray(data.statements), 'Insight input includes a statement collection');
    this.data = data;
    if (!data.ready || !this.active) return this.queue;
    const queued = this.enqueue(async () => { await this.load(); await this.evaluate(); });
    assert(queued === this.queue, 'Insight update returns the serialized queue');
    return queued;
  }
  setActive(active: boolean) {
    assert(typeof active === 'boolean', 'App activity is a boolean');
    this.active = active;
    assert(this.active === active, 'Coordinator records current activity');
    if (active && this.data) {
      const queued = this.update(this.data);
      assert(queued === this.queue, 'Foreground refresh uses the serialized queue');
      return queued;
    }
    return this.queue;
  }
  reset() {
    this.resetting = true;
    assert(this.resetting, 'Reset establishes a new insight baseline');
    const queued = this.enqueue(async () => {
      await this.deps.cancel();
      await this.load();
      const state = this.store.getSnapshot().context.settings;
      assert(Schema.is(InsightNotificationStateSchema)(state), 'Reset starts from valid settings');
      await this.save({ ...state, pending: null });
      assert(this.store.getSnapshot().context.settings.pending === null, 'Reset clears the notification batch');
    });
    assert(queued === this.queue, 'Reset is serialized with notification work');
    return queued;
  }
  private candidates() {
    if (!this.data?.ready) return [];
    return insightCandidates({ entries: this.data.entries, statements: this.data.statements, now: this.deps.now() });
  }
  private async evaluate() {
    if (!this.data?.ready || !this.active) return;
    let state = reconciledInsightDelivery({ state: this.store.getSnapshot().context.settings, now: this.deps.now() });
    assert(this.loaded, 'Evaluation requires loaded notification preferences');
    assert(Schema.is(InsightNotificationStateSchema)(state), 'Evaluation starts from valid settings');
    const candidates = this.candidates();
    if (this.resetting) {
      await this.deps.cancel();
      await this.save({ ...state, seen: candidates.map(({ id }) => id), pending: null });
      this.resetting = false;
      return;
    }
    const permission = await this.deps.permission();
    this.store.trigger.permissionChanged({ permission });
    if (!state.enabled || permission !== REMINDER_PERMISSION_STATES.GRANTED) {
      await this.deps.cancel();
      return;
    }
    if (state.pending && new Date(state.pending.fireAt) <= this.deps.now()) {
      state = { ...state, seen: [...new Set([...state.seen, ...state.pending.candidates.map(({ id }) => id)])], pending: null };
    }
    await this.scheduleCandidates({ state, candidates });
  }
  private async scheduleCandidates({ state, candidates }: {
    state: InsightNotificationState; candidates: ReturnType<typeof insightCandidates>;
  }) {
    if (!this.data) return;
    assert(state.enabled, 'Scheduling requires enabled insight notifications');
    assert(Schema.is(InsightNotificationStateSchema)(state), 'Scheduling starts from valid settings');
    const pending = pendingInsightCandidates({ state, candidates });
    const [first, ...rest] = pending;
    const batch = first ? {
      id: state.pending?.id ?? `${INSIGHT_NOTIFICATION_OWNER}-${this.deps.now().getTime()}-${this.deps.nonce()}`,
      fireAt: state.pending?.fireAt ?? nextInsightDelivery({ now: this.deps.now(), time: state.time }).toISOString(),
      candidates: [first, ...rest] satisfies readonly [typeof first, ...typeof rest],
    } : null;
    await this.save({ ...state, pending: batch });
    await this.deps.reconcile({ batch, locale: this.data.locale });
  }
  command(event: InsightNotificationCommand) {
    if (event.type === INSIGHT_NOTIFICATION_EVENTS.PICKER_CHANGED) {
      this.store.trigger.pickerChanged({ open: event.open });
      return this.queue;
    }
    return this.enqueue(async () => { await this.load(); await this.applyCommand(event); });
  }
  private async changeTime({ state, time }: { state: InsightNotificationState; time: ReminderLocalTime }) {
    await this.save({ ...state, time, pending: state.pending
      ? { ...state.pending, fireAt: nextInsightDelivery({ now: this.deps.now(), time }).toISOString() } : null });
  }
  private async applyCommand(event: InsightNotificationCommand) {
    const state = this.store.getSnapshot().context.settings;
    assert(this.loaded, 'Commands require loaded notification preferences');
    assert(Schema.is(InsightNotificationStateSchema)(state), 'Commands start from valid settings');
    if (event.type === INSIGHT_NOTIFICATION_EVENTS.SYSTEM_SETTINGS_REQUESTED) { await this.deps.openSettings(); return; }
    if (event.type === INSIGHT_NOTIFICATION_EVENTS.RECHECK_REQUESTED) { await this.evaluate(); return; }
    if (event.type === INSIGHT_NOTIFICATION_EVENTS.DISMISSED) { await this.save({ ...state, dismissed: true }); return; }
    if (event.type === INSIGHT_NOTIFICATION_EVENTS.DISABLED) {
      await this.deps.cancel();
      await this.save({ ...state, enabled: false, pending: null });
      return;
    }
    if (event.type === INSIGHT_NOTIFICATION_EVENTS.TIME_CHANGED) {
      await this.changeTime({ state, time: event.time });
      await this.evaluate();
      return;
    }
    if (event.type !== INSIGHT_NOTIFICATION_EVENTS.ENABLED || state.enabled || !this.data?.ready || !this.active) return;
    const permission = await this.deps.requestPermission();
    this.store.trigger.permissionChanged({ permission });
    if (permission !== REMINDER_PERMISSION_STATES.GRANTED) return;
    await this.save({ ...state, enabled: true, dismissed: true, seen: this.candidates().map(({ id }) => id), pending: null });
    await this.evaluate();
  }
}

export function watchInsightAppState(coordinator: InsightNotificationCoordinator) {
  void coordinator.setActive(AppState.currentState === 'active');
  return AppState.addEventListener('change', (state) => { void coordinator.setActive(state === 'active'); });
}
