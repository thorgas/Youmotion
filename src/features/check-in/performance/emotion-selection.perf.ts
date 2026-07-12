import { measureFunction } from 'reassure';

import { selectionFromPoint } from '../domain/emotion-selection';

function calculateSelectionSweep() {
  for (let step = 0; step < 1_000; step += 1) {
    selectionFromPoint({
      point: { x: step % 240, y: (step * 7) % 240 },
      center: { x: 120, y: 120 },
      maxRadius: 120,
    });
  }
}

test('maps a gesture sweep to emotion selections', async () => {
  await measureFunction(calculateSelectionSweep);
  expect(selectionFromPoint({ point: { x: 120, y: 20 }, center: { x: 120, y: 120 }, maxRadius: 120 })).not.toBeNull();
});
