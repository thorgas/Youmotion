import { selectionFromPoint } from '../domain/emotion-selection';

describe('selectionFromPoint', () => {
  const center = { x: 100, y: 100 };

  it('keeps the center neutral', () => {
    expect(selectionFromPoint({ point: center, center, maxRadius: 80 })).toBeNull();
  });

  it('maps an upward drag to Freude', () => {
    const selection = selectionFromPoint({ point: { x: 100, y: 32 }, center, maxRadius: 80 });
    expect(selection?.emotionId).toBe('freude');
    expect(selection?.intensity).toBeGreaterThan(0.7);
  });

  it('clamps drags beyond the star', () => {
    const selection = selectionFromPoint({ point: { x: 100, y: -200 }, center, maxRadius: 80 });
    expect(selection?.intensity).toBe(1);
    expect(selection?.nuance).toBe('Glück');
  });
});
