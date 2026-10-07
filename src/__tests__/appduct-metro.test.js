const mockWrapAppduct = jest.fn((config) => config);
const mockResolveRozenite = jest.fn();

jest.mock('expo/metro-config', () => ({
  getDefaultConfig: () => ({
    transformer: { assetRegistryPath: '@react-native/assets-registry/registry' },
    resolver: {},
  }),
}));
jest.mock('react-native-grab/metro', () => ({ withReactNativeGrab: (config) => config }));
jest.mock('@rozenite/metro', () => ({
  withRozenite: (config) => async () => { mockResolveRozenite(); return config; },
}));
jest.mock('@rozenite/require-profiler-plugin/metro', () => ({ withRozeniteRequireProfiler: jest.fn() }));
jest.mock('@callstack/inspector/metro', () => ({ withInspector: (config) => async () => config }));
jest.mock('@appduct/react-native/metro', () => ({ withAppduct: (...args) => mockWrapAppduct(...args) }));

const loadConfig = require('../../metro.config.cjs');

describe('Appduct Metro composition', () => {
  const previousE2E = process.env.EXPO_PUBLIC_E2E;
  const previousEnabled = process.env.APPDUCT_ENABLED;

  afterEach(() => {
    if (previousE2E === undefined) Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_E2E');
    else Object.assign(process.env, { EXPO_PUBLIC_E2E: previousE2E });
    if (previousEnabled === undefined) Reflect.deleteProperty(process.env, 'APPDUCT_ENABLED');
    else Object.assign(process.env, { APPDUCT_ENABLED: previousEnabled });
    jest.clearAllMocks();
  });

  it.each([
    ['true', undefined, true],
    ['false', undefined, false],
    ['true', '0', false],
  ])('resolves upstream configuration before applying the E2E gate (%s, %s)', async (e2e, enabled, included) => {
    Object.assign(process.env, { EXPO_PUBLIC_E2E: e2e });
    if (enabled === undefined) Reflect.deleteProperty(process.env, 'APPDUCT_ENABLED');
    else Object.assign(process.env, { APPDUCT_ENABLED: enabled });
    const config = await loadConfig();
    expect(mockResolveRozenite).toHaveBeenCalledTimes(1);
    expect(config.transformer.assetRegistryPath).toBe('@react-native/assets-registry/registry');
    expect(mockWrapAppduct).toHaveBeenCalledWith(config, { include: included });
  });
});
