import {
  pointConstrainedToRadius,
  selectionFromPoint,
} from '../domain/emotion-selection';

describe('selectionFromPoint', () => {
  const center = { x: 100, y: 100 };

  it('keeps the center neutral', () => {
    expect(selectionFromPoint({ point: center, center, maxRadius: 80 })).toBeNull();
  });

  it.each([
    ['freude', { x: 148, y: 52 }],
    ['liebe', { x: 168, y: 100 }],
    ['scham', { x: 148, y: 148 }],
    ['ekel', { x: 100, y: 168 }],
    ['trauer', { x: 52, y: 148 }],
    ['wut', { x: 32, y: 100 }],
    ['furcht', { x: 52, y: 52 }],
  ])('places %s on the same spoke as the German original', (emotionId, point) => {
    const selection = selectionFromPoint({ point, center, maxRadius: 80 });
    expect(selection?.emotionId).toBe(emotionId);
    expect(selection?.intensity).toBeGreaterThan(0.7);
  });

  it('clamps drags beyond the star', () => {
    const selection = selectionFromPoint({ point: { x: 400, y: -200 }, center, maxRadius: 80 });
    expect(selection?.intensity).toBe(1);
    expect(selection?.level).toBe(6);
  });
});

describe('pointConstrainedToRadius', () => {
  const center = { x: 100, y: 100 };

  it('preserves a point inside the Pulse boundary', () => {
    const point = { x: 140, y: 120 };

    expect(pointConstrainedToRadius({ point, center, maxRadius: 80 })).toBe(point);
  });

  it('pins an outward drag to the Pulse boundary', () => {
    expect(pointConstrainedToRadius({
      point: { x: 400, y: 100 },
      center,
      maxRadius: 80,
    })).toEqual({ x: 180, y: 100 });
  });

  it('preserves direction while pinning a diagonal drag', () => {
    const point = pointConstrainedToRadius({
      point: { x: 400, y: -200 },
      center,
      maxRadius: 80,
    });

    expect(Math.hypot(point.x - center.x, point.y - center.y)).toBeCloseTo(80);
    expect(point.x - center.x).toBeCloseTo(center.y - point.y);
  });
});
