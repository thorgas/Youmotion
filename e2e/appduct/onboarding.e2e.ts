import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';
import { developmentUrl, prepareAppductApp } from './setup';

test.beforeEach(async (fixtures) => { await prepareAppductApp(fixtures); });

test('opens Pulse without tapping through onboarding', async ({ app, screen }) => {
  await expect(screen.getByTestId('today-pulse-card')).toBeVisible();
  await app.screenshot('pulse-after-appduct-setup');
});

test('opens Settings and returns to Pulse after skipping onboarding', async ({ app, screen }) => {
  await screen.getByTestId('tab-settings').tap();
  await expect(screen.getByTestId('settings-screen')).toBeVisible();
  await app.screenshot('settings-after-appduct-setup');
  await screen.getByTestId('tab-today').tap();
  await expect(screen.getByTestId('today-screen')).toBeVisible();
});

test('keeps onboarding skipped after restarting the app', async ({ app, device, screen }) => {
  await app.restart();
  await device.openLink(developmentUrl);
  const openConfirmation = screen.getByRole('button', 'Open');
  if (await openConfirmation.isVisible()) await openConfirmation.tap();
  await expect(screen.getByTestId('today-screen')).toBeVisible();
  await expect(screen.getByTestId('onboarding-welcome-step')).not.toBeVisible();
});
