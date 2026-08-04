import type { PropsWithChildren } from 'react';
import { Pressable } from 'react-native';

export const PressableScale = Pressable;

export function PressablesConfig({ children }: PropsWithChildren) {
  return children;
}
