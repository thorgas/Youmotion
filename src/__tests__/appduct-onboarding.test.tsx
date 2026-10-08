import { render, screen } from '@testing-library/react-native';
import { createActor, waitFor, type Actor } from 'xstate';
import * as mockSchema from 'effect/Schema';
import * as mockEffect from 'effect/Effect';
import { appSettingsStore } from '@/app-stores';
import { APP_LOCALES, EMOTION_LABEL_MODES, NAVIGATION_STATES } from '@/constants';
import { AppSettingsSchema as mockAppSettingsSchema } from '@/features/settings/domain/app-settings';
import { appNavigationMachine } from '@/navigation/app-navigation.composition';
import { AppNavigationActorProvider } from '@/navigation/app-navigation.provider';
import { mockSurrealDatabase } from '@/test-utils/surrealdb.repository.mock';
import { AppductTools } from '@/development/appduct-tools';
import { installAppduct } from '@/development/install-appduct';
import { readOnboardingState, skipOnboarding } from '@/development/appduct-onboarding';

const mockTool = jest.fn();
const mockAuto = jest.fn();
let mockCompleted = false;
let mockWriteFailure = false;
let mockReadFailure = false;
let mockWriteGate: Promise<void> | undefined;
let actor: Actor<typeof appNavigationMachine>;

jest.mock('@appduct/react-native', () => ({ useAppductTool: (...args: unknown[]) => mockTool(...args) }));
jest.mock('@appduct/react-native/auto', () => { mockAuto(); return { getRegisteredTools: jest.fn(), getAppductState: jest.fn() }; });
jest.mock('expo-router', () => ({ router: {} }));
jest.mock('@/infrastructure/database/surrealdb.database', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockSurrealDatabase)),
  queryDatabase: jest.fn(async ({ surql, variables }: { surql: string; variables?: { settings?: unknown } }) => {
    if (surql.startsWith('SELECT locale')) {
      if (mockReadFailure) throw new Error('read failed');
      return [{ statementIndex: 0, value: [{ locale: 'en-US', emotionLabelMode: 'emoji', onboardingCompleted: mockCompleted }] }];
    }
    if (surql.startsWith('UPSERT') && variables?.settings) {
      if (mockWriteFailure) throw new Error('write failed');
      await mockWriteGate;
      const settings = await mockEffect.runPromise(mockSchema.decodeUnknown(mockAppSettingsSchema)(variables.settings));
      mockCompleted = settings.onboardingCompleted;
    }
    return [{ statementIndex: 0, value: surql.startsWith('SELECT') ? [] : null }];
  }),
}));

describe('Appduct onboarding consumer boundary', () => {
  const priorDevelopment = __DEV__;
  const priorE2E = process.env.EXPO_PUBLIC_E2E;

  beforeEach(() => {
    mockCompleted = false;
    mockWriteFailure = false;
    mockReadFailure = false;
    mockWriteGate = undefined;
    mockTool.mockClear();
    appSettingsStore.trigger.hydrated({ settings: {
      locale: APP_LOCALES.ENGLISH, emotionLabelMode: EMOTION_LABEL_MODES.EMOJI, onboardingCompleted: false,
    } });
    actor = createActor(appNavigationMachine).start();
  });

  afterEach(() => {
    actor.stop();
    Object.defineProperty(globalThis, '__DEV__', { value: priorDevelopment, configurable: true });
    if (priorE2E === undefined) Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_E2E');
    else Object.assign(process.env, { EXPO_PUBLIC_E2E: priorE2E });
  });

  it('skips via the real actor, persists completion and can be repeated', async () => {
    const signal = new AbortController().signal;
    await expect(readOnboardingState()).resolves.toEqual({ completed: false });
    await expect(skipOnboarding({ actor, signal })).resolves.toEqual({ completed: true });
    expect(actor.getSnapshot().matches(NAVIGATION_STATES.TABS)).toBe(true);
    expect(actor.getSnapshot().context.onboardingSelection).toBeNull();
    await expect(skipOnboarding({ actor, signal })).resolves.toEqual({ completed: true });
    await expect(readOnboardingState()).resolves.toEqual({ completed: true });
  });

  it('does not report success when persistence fails', async () => {
    mockWriteFailure = true;
    const controller = new AbortController();
    const pending = skipOnboarding({ actor, signal: controller.signal });
    const cancellation = waitFor(actor, () => appSettingsStore.getSnapshot().context.error !== null, { timeout: 1_000 }).then(() => controller.abort());
    await expect(pending).rejects.toBeDefined();
    await cancellation;
    expect(mockCompleted).toBe(false);
  });

  it('waits for delayed native persistence before reporting completion', async () => {
    let releaseWrite: (() => void) | undefined;
    mockWriteGate = new Promise<void>((resolve) => { releaseWrite = resolve; });
    const pending = skipOnboarding({ actor, signal: new AbortController().signal });
    await waitFor(actor, (snapshot) => snapshot.matches(NAVIGATION_STATES.TABS), { timeout: 1_000 });
    expect(mockCompleted).toBe(false);
    releaseWrite?.();
    await expect(pending).resolves.toEqual({ completed: true });
  });

  it('handles a module initialized with onboarding already completed', async () => {
    actor.stop();
    mockCompleted = true;
    appSettingsStore.trigger.hydrated({ settings: {
      locale: APP_LOCALES.ENGLISH, emotionLabelMode: EMOTION_LABEL_MODES.EMOJI, onboardingCompleted: true,
    } });
    actor = createActor(appNavigationMachine).start();
    await expect(skipOnboarding({ actor, signal: new AbortController().signal })).resolves.toEqual({ completed: true });
    expect(actor.getSnapshot().matches(NAVIGATION_STATES.TABS)).toBe(true);
  });

  it('fails setup if settings hydration cannot be read', async () => {
    actor.stop();
    mockReadFailure = true;
    actor = createActor(appNavigationMachine).start();
    await expect(skipOnboarding({ actor, signal: new AbortController().signal })).rejects.toBeDefined();
  });

  it('reports database read failures', async () => {
    mockReadFailure = true;
    await expect(readOnboardingState()).rejects.toBeDefined();
  });

  it.each([
    { development: false, e2e: 'true', enabled: false },
    { development: true, e2e: 'false', enabled: false },
    { development: true, e2e: 'true', enabled: true },
  ])('gates bootstrap and every tool: %p', async ({ development, e2e, enabled }) => {
    Object.defineProperty(globalThis, '__DEV__', { value: development, configurable: true });
    Object.assign(process.env, { EXPO_PUBLIC_E2E: e2e });
    installAppduct();
    await render(<AppNavigationActorProvider actor={actor}><AppductTools /></AppNavigationActorProvider>);
    expect(mockTool.mock.calls.map((call) => call[0].name)).toEqual(['skip_onboarding', 'get_onboarding_state', 'seed_archive_fixture', 'configure_source_code_browser', 'read_source_code_browser']);
    expect(mockTool.mock.calls.every((call) => call[2].enabled === enabled)).toBe(true);
    expect(screen.toJSON()).toBeNull();
    expect(mockAuto).toHaveBeenCalledTimes(enabled ? 1 : 0);
  });
});
