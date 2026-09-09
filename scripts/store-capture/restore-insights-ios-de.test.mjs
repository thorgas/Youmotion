import assert from 'node:assert/strict';
import test from 'node:test';
import { captureSteps, runCapture } from './restore-insights-ios-de.mjs';

test('requires explicit synthetic-device acknowledgement before any device work', () => {
  assert.throws(() => runCapture(['device', '/tmp/output']), /Usage/);
  assert.throws(() => captureSteps({ output: '/tmp/output' }), /explicit/);
});

test('gates replacement on archive counts and navigation on notice dismissal', () => {
  const steps = captureSteps({ device: 'dedicated-simulator', output: '/tmp/output' });
  const index = ({ command, selector }) => steps.findIndex((step) => step[0] === command && step[1] === selector);
  const replace = index({ command: 'press', selector: 'id="confirm-data-restore"' });
  assert.ok(index({ command: 'wait', selector: 'text="133"' }) < replace);
  assert.ok(index({ command: 'wait', selector: 'text="15"' }) < replace);
  assert.ok(index({ command: 'wait', selector: 'id="data-safety-notice"' }) < index({ command: 'press', selector: 'id="data-safety-notice"' }));
  assert.ok(index({ command: 'press', selector: 'id="data-safety-notice"' }) < index({ command: 'press', selector: 'id="tab-analytics"' }));
  assert.equal(steps.at(-1)[0], 'screenshot');
  assert.ok(index({ command: 'wait', selector: 'label="Freude: 34"' }) > replace);
});
