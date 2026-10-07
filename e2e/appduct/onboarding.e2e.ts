import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';
import { link, waitForSession } from 'appduct/client';
import archiveFixture from '../../src/features/data-safety/__tests__/fixtures/legacy-archive.fixture.json' with { type: 'json' };

const developmentUrl = 'exp+youmotion://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091';

type OnboardingTools = {
  skip_onboarding: { args: Record<string, never>; result: { completed: boolean } };
  get_onboarding_state: { args: Record<string, never>; result: { completed: boolean } };
  seed_archive_fixture: { args: { archive: unknown }; result: { moments: number; beliefs: number } };
};

test.beforeEach(async ({ app, device, screen }) => {
  await app.clearState();
  await device.openLink(developmentUrl);
  const openConfirmation = screen.getByRole('button', 'Open');
  if (await openConfirmation.isVisible()) await openConfirmation.tap();
  const welcome = screen.getByTestId('onboarding-welcome-step');
  const developerMenuContinue = screen.getByText('Continue');
  await expect.poll(async () => (
    await welcome.isVisible() || await developerMenuContinue.isVisible()
  ), { timeout: 30_000 }).toBe(true);
  if (await developerMenuContinue.isVisible()) {
    await screen.getByRole('button').tap();
    await device.back();
  }
  await expect(welcome).toBeVisible();
  const session = await link({ scheme: 'youmotion' });
  await device.openLink(session.deepLink);
  if (await openConfirmation.isVisible()) await openConfirmation.tap();
  const client = await waitForSession<OnboardingTools>(session.sessionId, { timeoutMs: 30_000 });
  try {
    await expect.poll(async () => {
      const tools = await client.tools();
      return ['get_onboarding_state', 'skip_onboarding', 'seed_archive_fixture'].every((name) => (
        tools.some((tool) => tool.name === name)
      ));
    }, { timeout: 30_000, interval: 200 }).toBe(true);
    expect(await client.call('get_onboarding_state', {})).toEqual({ completed: false });
    expect(await client.call('skip_onboarding', {})).toEqual({ completed: true });
    expect(await client.call('skip_onboarding', {})).toEqual({ completed: true });
    expect(await client.call('seed_archive_fixture', { archive: archiveFixture })).toEqual({ moments: 133, beliefs: 15 });
  } finally {
    client.close();
  }
  await app.restart();
  await device.openLink(developmentUrl);
  if (await openConfirmation.isVisible()) await openConfirmation.tap();
  await expect(screen.getByTestId('today-screen')).toBeVisible();
  await expect(screen.getByTestId('onboarding-welcome-step')).not.toBeVisible();
});

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
