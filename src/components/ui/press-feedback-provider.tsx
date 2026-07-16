import { PressablesConfig, type PressableConfig } from 'pressto';
import type { PropsWithChildren } from 'react';
import { ReduceMotion, type WithSpringConfig } from 'react-native-reanimated';

const PRESS_ANIMATION_CONFIG: WithSpringConfig = {
  damping: 30,
  mass: 1,
  reduceMotion: ReduceMotion.System,
  stiffness: 240,
};

const PRESS_VISUAL_CONFIG: Partial<PressableConfig> = {
  baseScale: 1,
  minScale: 0.97,
};

export function PressFeedbackProvider({ children }: PropsWithChildren) {
  return (
    <PressablesConfig
      animationConfig={PRESS_ANIMATION_CONFIG}
      animationType="spring"
      config={PRESS_VISUAL_CONFIG}>
      {children}
    </PressablesConfig>
  );
}
