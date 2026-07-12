import type { PropsWithChildren } from 'react';
import { ReactNativeGrabScreen } from 'react-native-grab';

export function DevelopmentScreen({ children }: PropsWithChildren) {
  return <ReactNativeGrabScreen style={{ flex: 1 }}>{children}</ReactNativeGrabScreen>;
}
