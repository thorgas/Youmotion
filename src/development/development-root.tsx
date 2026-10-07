import { usePerformanceMonitorDevTools } from '@rozenite/performance-monitor-plugin';
import { useRequireProfilerDevTools } from '@rozenite/require-profiler-plugin';
import type { PropsWithChildren } from 'react';
import { ReactNativeGrabRoot } from 'react-native-grab';
import assert from '@/assert';

export function DevelopmentRoot({ children }: PropsWithChildren) {
  assert(children !== undefined, 'Development root requires app content.');
  assert(children !== null, 'Development root cannot render null app content.');
  usePerformanceMonitorDevTools();
  useRequireProfilerDevTools();

  if (process.env.EXPO_PUBLIC_E2E === 'true') {
    if (!__DEV__) return children;
    // oxlint-disable-next-line typescript/no-unsafe-assignment -- Guarded development-only loading keeps the fixture and Appduct tools out of the Release module graph; bootstrap gate tests cover Release.
    const { AppductTools }: typeof import('./appduct-tools') = require('./appduct-tools');
    return <><AppductTools />{children}</>;
  }

  return <ReactNativeGrabRoot style={{ flex: 1 }}>{children}</ReactNativeGrabRoot>;
}
