import { emotions, type EmotionSelection } from './emotion';

const TAU = Math.PI * 2;
const START_ANGLE = -Math.PI / 2;

export type Point = Readonly<{ x: number; y: number }>;

const _clamp = ({ value, min, max }: { value: number; min: number; max: number }) => Math.max(min, Math.min(value, max));

const _circularDistance = ({ a, b }: { a: number; b: number }) => {
  const difference = Math.abs(a - b) % TAU;
  return Math.min(difference, TAU - difference);
};

export function emotionAngle(index: number) {
  return START_ANGLE + index * (TAU / emotions.length);
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
  const level = Math.min(Math.floor(intensity * emotion.nuances.length), emotion.nuances.length - 1);
  const nuance = emotion.nuances[level] ?? emotion.nuances[0] ?? emotion.name;

  return {
    emotionId: emotion.id,
    emotion: emotion.name,
    nuance,
    intensity,
    level,
    color: emotion.color,
  };
}
