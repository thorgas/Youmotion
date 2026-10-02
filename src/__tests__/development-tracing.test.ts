import { installDevelopmentTracing } from '../development/install-tracing';

const mockInstall = jest.fn();
const mockLoadBackend = jest.fn();

jest.mock('@ottrelite/backend-wrapper-tracy', () => {
  mockLoadBackend();
  return { OttreliteBackendTracy: { install: jest.fn() } };
});
jest.mock('@ottrelite/core', () => ({ Ottrelite: { install: mockInstall } }));

describe('development tracing startup boundary', () => {
  const previousDevelopment = __DEV__;
  const previousTracing = process.env['EXPO_PUBLIC_ENABLE_TRACY'];

  afterEach(() => {
    Object.defineProperty(globalThis, '__DEV__', { value: previousDevelopment, configurable: true });
    if (previousTracing === undefined) delete process.env['EXPO_PUBLIC_ENABLE_TRACY'];
    else process.env['EXPO_PUBLIC_ENABLE_TRACY'] = previousTracing;
    jest.clearAllMocks();
  });

  it('does not load the native backend in Release, where it is absent', () => {
    Object.defineProperty(globalThis, '__DEV__', { value: false, configurable: true });
    process.env['EXPO_PUBLIC_ENABLE_TRACY'] = 'true';
    installDevelopmentTracing();
    expect(mockLoadBackend).not.toHaveBeenCalled();
    expect(mockInstall).not.toHaveBeenCalled();
  });

  it('does not load the missing native backend in a normal development build', () => {
    Object.defineProperty(globalThis, '__DEV__', { value: true, configurable: true });
    delete process.env['EXPO_PUBLIC_ENABLE_TRACY'];
    installDevelopmentTracing();
    expect(mockLoadBackend).not.toHaveBeenCalled();
    expect(mockInstall).not.toHaveBeenCalled();
  });

  it('retains explicitly enabled Tracy profiling in development', () => {
    Object.defineProperty(globalThis, '__DEV__', { value: true, configurable: true });
    process.env['EXPO_PUBLIC_ENABLE_TRACY'] = 'true';
    installDevelopmentTracing();
    expect(mockLoadBackend).toHaveBeenCalledTimes(1);
    expect(mockInstall).toHaveBeenCalledWith([expect.objectContaining({ install: expect.any(Function) })]);
  });
});
