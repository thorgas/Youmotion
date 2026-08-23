import { usePerformanceMonitorDevTools } from '@rozenite/performance-monitor-plugin';
import { useRequireProfilerDevTools } from '@rozenite/require-profiler-plugin';
import type { PropsWithChildren } from 'react';
import { ReactNativeGrabRoot } from 'react-native-grab';

export function DevelopmentRoot({ children }: PropsWithChildren) {
  usePerformanceMonitorDevTools();
  useRequireProfilerDevTools();

  if (
    process.env.EXPO_PUBLIC_E2E === 'true'
    || process.env.EXPO_PUBLIC_MAESTRO === 'true'
  ) {
    return children;
  }

  return <ReactNativeGrabRoot style={{ flex: 1 }}>{children}</ReactNativeGrabRoot>;
}
