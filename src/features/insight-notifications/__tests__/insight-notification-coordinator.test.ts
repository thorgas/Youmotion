import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import {
  APP_LOCALES,
  INSIGHT_NOTIFICATION_EVENTS,
  REMINDER_PERMISSION_STATES,
} from '@/constants';
import { currentDataArchive, PersistedDataArchiveSchema } from '@/features/data-safety/domain/data-archive';
import { CheckInId, CheckInSchema, CheckInTimestamp, type CheckIn } from '@/features/check-in/domain/check-in';
import type { BeliefStatement } from '@/features/beliefs/domain/belief-statement';
import legacyArchive from '@/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json';
import { InsightNotificationCoordinator, type InsightDependencies, type InsightData, type InsightNotificationCommand } from '../application/insight-notification-coordinator';
import { createInsightNotificationStore } from '../application/insight-notification.store';
import { initialInsightNotificationState, insightCandidates } from '../domain/insight-notification';
const archive = currentDataArchive(Effect.runSync(Schema.decodeUnknown(PersistedDataArchiveSchema)(legacyArchive)));
const archiveData = {
  entries: archive.checkIns,
  statements: archive.beliefStatements,
  locale: APP_LOCALES.ENGLISH,
  ready: true,
};
const builtInStatement = archive.beliefStatements.find(
  (statement): statement is Extract<BeliefStatement, { kind: 'built-in' }> => statement.kind === 'built-in',
);
const makeCheckIn = ({ id, at, emotionId, beliefSystemId }: {
  id: string;
  at: string;
  emotionId: CheckIn['emotionId'];
  beliefSystemId?: CheckIn['beliefSystemId'];
}): CheckIn => CheckInSchema.make({
  id: CheckInId.make(id),
  createdAt: CheckInTimestamp.make(at),
  occurredAt: CheckInTimestamp.make(at),
  emotionId,
  intensity: 0.7,
  level: 2,
  note: '',
  ...(beliefSystemId ? { beliefSystemId, guidingStatementSnapshot: 'I can take a breath.' } : {}),
});

const instant = new Date('2026-10-01T10:00:00.000Z');
const baselineEntries = [0, 1, 2, 3].map((index) => makeCheckIn({
  id: `baseline-${String(index)}`,
  at: `2026-09-${String(27 + index).padStart(2, '0')}T09:00:00.000Z`,
  emotionId: 'freude',
}));
const baselineData: InsightData = {
  entries: baselineEntries,
  statements: archiveData.statements,
  locale: APP_LOCALES.ENGLISH,
  ready: true,
};

function rig({
  settings = initialInsightNotificationState(),
  permission = REMINDER_PERMISSION_STATES.GRANTED,
  loadError,
  persistError,
  reconcileError,
}: {
  settings?: ReturnType<typeof initialInsightNotificationState>;
  permission?: typeof REMINDER_PERMISSION_STATES[keyof typeof REMINDER_PERMISSION_STATES];
  loadError?: Error;
  persistError?: Error;
  reconcileError?: Error;
} = {}) {
  let saved = settings;
  const reconciliations: Array<{
    batch: Parameters<InsightDependencies['reconcile']>[0]['batch'];
    locale: Parameters<InsightDependencies['reconcile']>[0]['locale'];
  }> = [];
  const deps: InsightDependencies = {
    load: jest.fn(async () => {
      if (loadError) throw loadError;
      return saved;
    }),
    persist: jest.fn(async (value) => {
      if (persistError) throw persistError;
      saved = value;
    }),
    permission: jest.fn(async () => permission),
    requestPermission: jest.fn(async () => permission),
    reconcile: jest.fn(async ({ batch, locale }) => {
      reconciliations.push({ batch, locale });
      if (reconcileError) throw reconcileError;
    }),
    cancel: jest.fn(async () => undefined),
    now: jest.fn(() => new Date(instant)),
    nonce: jest.fn(() => 'test-nonce'),
    openSettings: jest.fn(async () => undefined),
  };
  const store = createInsightNotificationStore();
  const coordinator = new InsightNotificationCoordinator({ store, deps });
  return { coordinator, deps, store, getSaved: () => saved, reconciliations };
}

const enable = (): InsightNotificationCommand => ({ type: INSIGHT_NOTIFICATION_EVENTS.ENABLED });
const recheck = (): InsightNotificationCommand => ({ type: INSIGHT_NOTIFICATION_EVENTS.RECHECK_REQUESTED });

describe('insight notification coordinator', () => {
  it('waits for ready data and foreground activation before hydration or permission checks', async () => {
    const { coordinator, deps } = rig({ settings: { ...initialInsightNotificationState(), enabled: true } });
    await coordinator.setActive(false);
    await coordinator.update({ ...baselineData, ready: false });
    expect(deps.load).not.toHaveBeenCalled();
    await coordinator.update(baselineData);
    expect(deps.load).not.toHaveBeenCalled();
    await coordinator.setActive(true);
    expect(deps.load).toHaveBeenCalledTimes(1);
    expect(deps.permission).toHaveBeenCalledTimes(1);
  });

  it('does not schedule existing insights when permission is denied', async () => {
    const { coordinator, deps, store } = rig({
      settings: { ...initialInsightNotificationState(), enabled: true },
      permission: REMINDER_PERMISSION_STATES.DENIED,
    });
    await coordinator.update(baselineData);
    expect(store.getSnapshot().context.permission).toBe(REMINDER_PERMISSION_STATES.DENIED);
    expect(deps.cancel).toHaveBeenCalledTimes(1);
    expect(deps.reconcile).not.toHaveBeenCalled();
  });

  it('uses enabling as a baseline so earlier insights never trigger retroactive delivery', async () => {
    const { coordinator, deps, getSaved } = rig();
    await coordinator.update(baselineData);
    await coordinator.command(enable());
    const candidates = insightCandidates({ entries: baselineData.entries, statements: baselineData.statements, now: instant });
    expect(getSaved()).toMatchObject({
      enabled: true,
      dismissed: true,
      seen: candidates.map(({ id }) => id),
      pending: null,
    });
    expect(deps.reconcile).toHaveBeenLastCalledWith({ batch: null, locale: APP_LOCALES.ENGLISH });
  });

  it('schedules novel insights, coalesces candidates, and reuses the same pending request on repeat updates', async () => {
    const { coordinator, deps, getSaved, reconciliations } = rig({
      settings: { ...initialInsightNotificationState(), enabled: true },
    });
    await coordinator.update({ ...baselineData, entries: [] });
    const firstNewData: InsightData = { ...baselineData, entries: [] };
    await coordinator.update(firstNewData);
    const newEntries = [0, 1, 2].map((index) => makeCheckIn({
      id: `new-belief-${String(index)}`,
      at: `2026-09-${String(28 + index).padStart(2, '0')}T11:00:00.000Z`,
      emotionId: 'furcht',
      ...(builtInStatement ? { beliefSystemId: builtInStatement.beliefSystemId } : {}),
    }));
    const evolved: InsightData = { ...baselineData, entries: [...baselineEntries, ...newEntries] };
    await coordinator.update(evolved);
    const firstBatch = getSaved().pending;
    expect(firstBatch).not.toBeNull();
    expect(firstBatch?.candidates.length).toBeGreaterThan(1);
    expect(deps.reconcile).toHaveBeenLastCalledWith({ batch: firstBatch, locale: APP_LOCALES.ENGLISH });
    await coordinator.update(evolved);
    expect(getSaved().pending).toEqual(firstBatch);
    expect(reconciliations.at(-1)?.batch?.id).toBe(firstBatch?.id);
  });

  it('reschedules a pending batch when its delivery time changes, and clears it when disabled', async () => {
    const { coordinator, deps, getSaved } = rig({
      settings: { ...initialInsightNotificationState(), enabled: true },
    });
    await coordinator.update(baselineData);
    const before = getSaved().pending;
    expect(before).not.toBeNull();
    await coordinator.command({ type: INSIGHT_NOTIFICATION_EVENTS.TIME_CHANGED, time: { hour: 14, minute: 0 } });
    const after = getSaved().pending;
    expect(after?.id).toBe(before?.id);
    expect(after?.fireAt).toBe('2026-10-01T12:00:00.000Z');
    await coordinator.command({ type: INSIGHT_NOTIFICATION_EVENTS.DISABLED });
    expect(deps.cancel).toHaveBeenCalled();
    expect(getSaved()).toMatchObject({ enabled: false, pending: null });
  });

  it('clears native work on reset and records current insights as seen on the next evaluation', async () => {
    const { coordinator, deps, getSaved } = rig({
      settings: { ...initialInsightNotificationState(), enabled: true },
    });
    await coordinator.update(baselineData);
    expect(getSaved().pending).not.toBeNull();
    await coordinator.reset();
    expect(deps.cancel).toHaveBeenCalledTimes(1);
    expect(getSaved().pending).toBeNull();
    await coordinator.update(baselineData);
    expect(getSaved().seen).toEqual(insightCandidates({
      entries: baselineData.entries,
      statements: baselineData.statements,
      now: instant,
    }).map(({ id }) => id));
    expect(getSaved().pending).toBeNull();
  });

  it('surfaces hydration and persistence failures without scheduling', async () => {
    const hydration = rig({ loadError: new Error('storage unavailable') });
    await hydration.coordinator.update(baselineData);
    expect(hydration.store.getSnapshot().context.hydrated).toBe(false);
    expect(hydration.store.getSnapshot().context.error).toBe('Insight notifications could not be updated. Try again.');
    expect(hydration.deps.permission).not.toHaveBeenCalled();

    const persistence = rig({
      settings: { ...initialInsightNotificationState(), enabled: true },
      persistError: new Error('storage unavailable'),
    });
    await persistence.coordinator.update(baselineData);
    expect(persistence.deps.reconcile).not.toHaveBeenCalled();
    expect(persistence.store.getSnapshot().context.error).toBe('Insight notifications could not be updated. Try again.');
  });

  it('retains persisted intent after native reconciliation fails so restart can retry the same batch', async () => {
    const failed = rig({
      settings: { ...initialInsightNotificationState(), enabled: true },
      reconcileError: new Error('native scheduler unavailable'),
    });
    await failed.coordinator.update(baselineData);
    const retained = failed.getSaved().pending;
    expect(retained).not.toBeNull();
    expect(failed.store.getSnapshot().context.error).toBe('Insight notifications could not be updated. Try again.');

    const restarted = rig({ settings: failed.getSaved() });
    await restarted.coordinator.update(baselineData);
    expect(restarted.deps.reconcile).toHaveBeenCalledWith({ batch: retained, locale: APP_LOCALES.ENGLISH });
    expect(restarted.getSaved().pending?.id).toBe(retained?.id);
  });

  it('requests permission only after ready data and leaves settings unchanged when denied', async () => {
    const { coordinator, deps, getSaved } = rig({ permission: REMINDER_PERMISSION_STATES.DENIED });
    await coordinator.update({ ...baselineData, ready: false });
    await coordinator.command(enable());
    expect(deps.requestPermission).not.toHaveBeenCalled();
    await coordinator.update(baselineData);
    const before = getSaved();
    await coordinator.command(enable());
    expect(getSaved()).toEqual(before);
    expect(deps.requestPermission).toHaveBeenCalledTimes(1);
  });

  it('handles explicit recheck, dismissal, picker state, and system settings commands', async () => {
    const { coordinator, deps, store } = rig();
    await coordinator.update({ ...baselineData, entries: [] });
    await coordinator.command({ type: INSIGHT_NOTIFICATION_EVENTS.DISMISSED });
    expect(store.getSnapshot().context.settings.dismissed).toBe(true);
    await coordinator.command({ type: INSIGHT_NOTIFICATION_EVENTS.PICKER_CHANGED, open: true });
    expect(store.getSnapshot().context.pickerOpen).toBe(true);
    await coordinator.command({ type: INSIGHT_NOTIFICATION_EVENTS.SYSTEM_SETTINGS_REQUESTED });
    expect(deps.openSettings).toHaveBeenCalledTimes(1);
    await coordinator.command(recheck());
    expect(deps.permission).toHaveBeenCalled();
  });
});
