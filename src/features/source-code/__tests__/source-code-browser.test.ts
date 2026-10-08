import * as WebBrowser from 'expo-web-browser';
import { SOURCE_CODE_URL } from '@/constants';
import { configureSourceCodeBrowserTest, readSourceCodeBrowserTest, openSourceCode } from '../infrastructure/source-code-browser';

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
const mockOpenBrowser = jest.mocked(WebBrowser.openBrowserAsync);

describe('source code browser', () => {
  const originalE2E = process.env.EXPO_PUBLIC_E2E;
  beforeEach(() => {
    Object.defineProperty(process.env, 'EXPO_PUBLIC_E2E', { configurable: true, writable: true, value: 'true' });
    configureSourceCodeBrowserTest({ mode: 'native' });
    mockOpenBrowser.mockReset();
  });
  afterEach(() => { Object.defineProperty(process.env, 'EXPO_PUBLIC_E2E', { configurable: true, writable: true, value: originalE2E }); });
  it('opens only the configured HTTPS repository with browser dismissal', async () => {
    await openSourceCode();
    expect(mockOpenBrowser).toHaveBeenCalledWith(SOURCE_CODE_URL, expect.objectContaining({ dismissButtonStyle: 'close', showTitle: true }));
    expect(SOURCE_CODE_URL).toBe('https://github.com/thorgas/Youmotion');
  });
  it('simulates browser success and failure only at the exact repository boundary', async () => {
    configureSourceCodeBrowserTest({ mode: 'failure' });
    await expect(openSourceCode()).rejects.toMatchObject({ _tag: 'SourceCodeBrowserError' });
    expect(readSourceCodeBrowserTest()).toEqual({ mode: 'failure', urls: [SOURCE_CODE_URL] });
    configureSourceCodeBrowserTest({ mode: 'success' });
    await openSourceCode();
    expect(readSourceCodeBrowserTest()).toEqual({ mode: 'success', urls: [SOURCE_CODE_URL] });
    expect(mockOpenBrowser).not.toHaveBeenCalled();
  });
  it('rejects test controls without explicit E2E mode and continues to use the native browser', async () => {
    configureSourceCodeBrowserTest({ mode: 'failure' });
    Object.defineProperty(process.env, 'EXPO_PUBLIC_E2E', { configurable: true, writable: true, value: 'false' });
    expect(() => configureSourceCodeBrowserTest({ mode: 'success' })).toThrow('Source code browser test control requires');
    expect(() => readSourceCodeBrowserTest()).toThrow('Source code browser test control requires');
    await openSourceCode();
    expect(mockOpenBrowser).toHaveBeenCalledWith(SOURCE_CODE_URL, expect.any(Object));
  });
  it('rejects test controls in production and continues to use the native browser', async () => {
    configureSourceCodeBrowserTest({ mode: 'failure' });
    const originalDev = __DEV__;
    Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
    try {
      expect(() => configureSourceCodeBrowserTest({ mode: 'success' })).toThrow('Source code browser test control requires');
      expect(() => readSourceCodeBrowserTest()).toThrow('Source code browser test control requires');
      await openSourceCode();
      expect(mockOpenBrowser).toHaveBeenCalledWith(SOURCE_CODE_URL, expect.any(Object));
    } finally {
      Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: originalDev });
    }
  });
  it('reports browser launch failure as an expected error', async () => {
    mockOpenBrowser.mockRejectedValue(new Error('unavailable'));
    await expect(openSourceCode()).rejects.toMatchObject({ _tag: 'SourceCodeBrowserError' });
  });
});
