import { EMOTION_AXIS_START_ANGLE, EMOTION_AXIS_STEP } from '@/constants';
import { emotions, type EmotionSelection } from './emotion';

const TAU = Math.PI * 2;
const DEFAULT_ACCESSIBLE_INTENSITY = 0.35;

export type Point = Readonly<{ x: number; y: number }>;

const _clamp = ({ value, min, max }: { value: number; min: number; max: number }) => Math.max(min, Math.min(value, max));

const _circularDistance = ({ a, b }: { a: number; b: number }) => {
  const difference = Math.abs(a - b) % TAU;
  return Math.min(difference, TAU - difference);
};

export function emotionAngle(index: number) {
  return EMOTION_AXIS_START_ANGLE + index * EMOTION_AXIS_STEP;
}

export function pointConstrainedToRadius({
  point,
  center,
  maxRadius,
}: {
  point: Point;
  center: Point;
  maxRadius: number;
}) {
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

export function selectionFromPoint({
  point,
  center,
  maxRadius,
  deadZone = 22,
}: {
  point: Point;
  center: Point;
  maxRadius: number;
  deadZone?: number;
}): EmotionSelection | null {
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

function _selectionForEmotion({
  emotionIndex,
  intensity,
}: {
  emotionIndex: number;
  intensity: number;
}) {
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

export function emotionSelectionWithAdjustedIntensity({
  direction,
  selection,
}: {
  direction: -1 | 1;
  selection: EmotionSelection | null;
}) {
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

export function emotionSelectionWithAdjacentEmotion({
  direction,
  selection,
}: {
  direction: -1 | 1;
  selection: EmotionSelection | null;
}) {
  const currentIndex = selection
    ? emotions.findIndex((emotion) => emotion.id === selection.emotionId)
    : direction > 0 ? -1 : 0;
  const emotionIndex = (currentIndex + direction + emotions.length) % emotions.length;

  return _selectionForEmotion({
    emotionIndex,
    intensity: selection?.intensity ?? DEFAULT_ACCESSIBLE_INTENSITY,
  });
}
