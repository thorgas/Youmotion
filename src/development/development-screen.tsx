import type { PropsWithChildren } from 'react';
import { ReactNativeGrabScreen } from 'react-native-grab';

export function DevelopmentScreen({ children }: PropsWithChildren) {
  if (
    process.env.EXPO_PUBLIC_E2E === 'true'
    || process.env.EXPO_PUBLIC_MAESTRO === 'true'
  ) {
    return children;
  }

  return <ReactNativeGrabScreen style={{ flex: 1 }}>{children}</ReactNativeGrabScreen>;
}
