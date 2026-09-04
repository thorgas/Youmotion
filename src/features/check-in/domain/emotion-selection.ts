import { EMOTION_AXIS_START_ANGLE, EMOTION_AXIS_STEP } from '@/constants';
import type { EmotionSelection } from './check-in';
import { emotions } from './emotion';
import assert from '@/assert';

export type Point = Readonly<{ x: number; y: number }>;

export const emotionAngle = (index: number) => {
  assert(Number.isInteger(index), 'Emotion index must be an integer.');
  assert(index >= 0 && index < emotions.length, 'Emotion index must reference the catalog.');
  return EMOTION_AXIS_START_ANGLE + index * EMOTION_AXIS_STEP;
}

export const pointConstrainedToRadius = ({
  point,
  center,
  maxRadius,
}: {
  point: Point;
  center: Point;
  maxRadius: number;
}) => {
  assert(Number.isFinite(maxRadius), 'Selection radius must be finite.');
  assert(maxRadius >= 0, 'Selection radius must not be negative.');
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0 || distance <= maxRadius) return point;
  const scale = maxRadius / distance;

  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
  };
}

export const selectionFromPoint = ({
  point,
  center,
  maxRadius,
  deadZone = 22,
}: {
  point: Point;
  center: Point;
  maxRadius: number;
  deadZone?: number;
}): EmotionSelection | null => {
  assert(Number.isFinite(maxRadius), 'Selection radius must be finite.');
  assert(deadZone >= 0, 'Selection dead zone must not be negative.');
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const distance = Math.hypot(dx, dy);
  if (distance < deadZone) return null;

  const angle = Math.atan2(dy, dx);
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  emotions.forEach((_, index) => {
    const distanceFromAxis = _circularDistance({ a: angle, b: emotionAngle(index) });
    if (distanceFromAxis < closestDistance) {
      closestDistance = distanceFromAxis;
      closestIndex = index;
    }
  });

  const emotion = emotions[closestIndex] ?? emotions[0];
  if (!emotion) return null;
  const intensity = _clamp({ value: (distance - deadZone) / Math.max(maxRadius - deadZone, 1), min: 0, max: 1 });
  const level = Math.min(Math.floor(intensity * emotion.nuanceCount), emotion.nuanceCount - 1);

  return {
    emotionId: emotion.id,
    intensity,
    level,
    color: emotion.color,
  };
}

export const emotionSelectionWithAdjustedIntensity = ({
  direction,
  selection,
}: {
  direction: -1 | 1;
  selection: EmotionSelection | null;
}) => {
  assert(direction === -1 || direction === 1, 'Intensity adjustment must be adjacent.');
  assert(selection === null || emotions.some((emotion) => emotion.id === selection.emotionId), 'Selection must reference the emotion catalog.');
  const emotionIndex = selection
    ? emotions.findIndex((emotion) => emotion.id === selection.emotionId)
    : 0;
  const emotion = emotions[emotionIndex];
  if (!emotion) return null;
  const intensity = selection?.intensity ?? DEFAULT_ACCESSIBLE_INTENSITY;

  return _selectionForEmotion({
    emotionIndex,
    intensity: intensity + direction / emotion.nuanceCount,
  });
}

export const emotionSelectionWithAdjacentEmotion = ({
  direction,
  selection,
}: {
  direction: -1 | 1;
  selection: EmotionSelection | null;
}) => {
  assert(direction === -1 || direction === 1, 'Emotion adjustment must be adjacent.');
  assert(emotions.length > 0, 'Emotion adjustment requires a populated catalog.');
  const currentIndex = selection
    ? emotions.findIndex((emotion) => emotion.id === selection.emotionId)
    : direction > 0 ? -1 : 0;
  const emotionIndex = (currentIndex + direction + emotions.length) % emotions.length;

  return _selectionForEmotion({
    emotionIndex,
    intensity: selection?.intensity ?? DEFAULT_ACCESSIBLE_INTENSITY,
  });
}

const TAU = Math.PI * 2;
const DEFAULT_ACCESSIBLE_INTENSITY = 0.35;

const _clamp = ({ value, min, max }: { value: number; min: number; max: number }) => Math.max(min, Math.min(value, max));

const _circularDistance = ({ a, b }: { a: number; b: number }) => {
  const difference = Math.abs(a - b) % TAU;
  return Math.min(difference, TAU - difference);
};

const _selectionForEmotion = ({
  emotionIndex,
  intensity,
}: {
  emotionIndex: number;
  intensity: number;
}) => {
  assert(Number.isInteger(emotionIndex), 'Emotion index must be an integer.');
  assert(Number.isFinite(intensity), 'Emotion intensity must be finite.');
  const emotion = emotions[emotionIndex];
  if (!emotion) return null;
  const clampedIntensity = _clamp({ value: intensity, min: 0, max: 1 });

  return {
    emotionId: emotion.id,
    intensity: clampedIntensity,
    level: Math.min(
      Math.floor(clampedIntensity * emotion.nuanceCount),
      emotion.nuanceCount - 1,
    ),
    color: emotion.color,
  } satisfies EmotionSelection;
}
