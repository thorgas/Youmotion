import { usePerformanceMonitorDevTools } from '@rozenite/performance-monitor-plugin';
import { useRequireProfilerDevTools } from '@rozenite/require-profiler-plugin';
import type { PropsWithChildren } from 'react';
import { ReactNativeGrabRoot } from 'react-native-grab';

export function DevelopmentRoot({ children }: PropsWithChildren) {
  usePerformanceMonitorDevTools();
  useRequireProfilerDevTools();

  return <ReactNativeGrabRoot style={{ flex: 1 }}>{children}</ReactNativeGrabRoot>;
}
