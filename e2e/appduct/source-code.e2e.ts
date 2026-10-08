import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';
import { link, waitForSession } from 'appduct/client';
import { prepareAppductApp } from './setup';

type SourceTools = {
  configure_source_code_browser: { args: { mode: 'success' | 'failure' | 'native' }; result: { mode: string; urls: string[] } };
  read_source_code_browser: { args: Record<string, never>; result: { mode: string; urls: string[] } };
};

const sourceUrl = 'https://github.com/thorgas/Youmotion';

test('source code opens the canonical repository and returns to Settings', async ({ app, device, screen }) => {
  await prepareAppductApp({ app, device, screen });
  const session = await link({ scheme: 'youmotion' });
  const bootstrapUrl = new URL(session.deepLink);
  bootstrapUrl.hostname = 'today';
  bootstrapUrl.pathname = '';
  await device.openLink(bootstrapUrl.toString());
  const openConfirmation = screen.getByRole('button', 'Open');
  if (await openConfirmation.isVisible()) await openConfirmation.tap();
  await expect(screen.getByTestId('today-screen')).toBeVisible();
  const client = await waitForSession<SourceTools>(session.sessionId, { timeoutMs: 30_000 });
  try {
    await expect.poll(async () => (await client.tools()).some((tool) => tool.name === 'configure_source_code_browser')).toBe(true);
    expect(await client.call('configure_source_code_browser', { mode: 'success' })).toEqual({ mode: 'success', urls: [] });
    await screen.getByTestId('tab-settings').tap();
    await screen.scrollUntilVisible(screen.getByTestId('open-source-code'), { direction: 'down' });
    await expect(screen.getByTestId('open-source-code')).toBeVisible();
    await app.screenshot('source-code-settings');
    await screen.getByTestId('open-source-code').tap();
    await expect.poll(() => client.call('read_source_code_browser', {})).toEqual({ mode: 'success', urls: [sourceUrl] });
    await expect(screen.getByTestId('source-code-error')).not.toBeVisible();
    await expect(screen.getByTestId('settings-screen')).toBeVisible();
    await screen.getByTestId('tab-today').tap();
    await expect(screen.getByTestId('today-screen')).toBeVisible();
  } finally {
    await client.call('configure_source_code_browser', { mode: 'native' });
    client.close();
  }
});

test('source code browser failure can be dismissed and retried', async ({ app, device, screen }) => {
  await prepareAppductApp({ app, device, screen });
  const session = await link({ scheme: 'youmotion' });
  const bootstrapUrl = new URL(session.deepLink);
  bootstrapUrl.hostname = 'today';
  bootstrapUrl.pathname = '';
  await device.openLink(bootstrapUrl.toString());
  const openConfirmation = screen.getByRole('button', 'Open');
  if (await openConfirmation.isVisible()) await openConfirmation.tap();
  await expect(screen.getByTestId('today-screen')).toBeVisible();
  const client = await waitForSession<SourceTools>(session.sessionId, { timeoutMs: 30_000 });
  try {
    await expect.poll(async () => (await client.tools()).some((tool) => tool.name === 'configure_source_code_browser')).toBe(true);
    await client.call('configure_source_code_browser', { mode: 'failure' });
    await screen.getByTestId('tab-settings').tap();
    await screen.scrollUntilVisible(screen.getByTestId('language-german'), { direction: 'up' });
    await screen.getByTestId('language-german').tap();
    await screen.scrollUntilVisible(screen.getByTestId('open-source-code'), { direction: 'down' });
    await screen.getByTestId('open-source-code').tap();
    await expect(screen.getByTestId('source-code-error')).toBeVisible();
    await expect(screen.getByTestId('open-source-code')).toContainText('Quellcode');
    await screen.scrollUntilVisible(screen.getByTestId('retry-source-code'), { direction: 'down' });
    const retryBounds = await screen.getByTestId('retry-source-code').boundingBox();
    const tabBounds = await screen.getByTestId('tab-settings').boundingBox();
    const errorBounds = await screen.getByTestId('source-code-error').boundingBox();
    if (retryBounds === null || tabBounds === null || errorBounds === null) throw new Error('Recovery controls require measurable native frames.');
    if (retryBounds.y + retryBounds.height > tabBounds.y - 24) {
      const startY = Math.min(errorBounds.y + errorBounds.height / 2, tabBounds.y - 32);
      const offset = retryBounds.y + retryBounds.height - tabBounds.y + 80;
      const centerX = errorBounds.x + errorBounds.width / 2;
      await screen.swipe({ from: { x: centerX, y: startY }, to: { x: centerX, y: Math.max(80, startY - offset) } });
    }
    const visibleRetryBounds = await screen.getByTestId('retry-source-code').boundingBox();
    if (visibleRetryBounds === null || visibleRetryBounds.y + visibleRetryBounds.height > tabBounds.y - 16) throw new Error('Recovery actions must remain fully above the tab bar.');
    await expect(screen.getByTestId('dismiss-source-code-error')).toBeVisible();
    await expect(screen.getByTestId('retry-source-code')).toBeVisible();
    await app.screenshot('source-code-browser-failure-de');
    await screen.getByTestId('dismiss-source-code-error').tap();
    await expect(screen.getByTestId('source-code-error')).not.toBeVisible();
    await screen.getByTestId('open-source-code').tap();
    await expect(screen.getByTestId('source-code-error')).toBeVisible();
    expect(await client.call('read_source_code_browser', {})).toEqual({ mode: 'failure', urls: [sourceUrl, sourceUrl] });
    await client.call('configure_source_code_browser', { mode: 'success' });
    await screen.getByTestId('retry-source-code').tap();
    await expect(screen.getByTestId('source-code-error')).not.toBeVisible();
    expect(await client.call('read_source_code_browser', {})).toEqual({ mode: 'success', urls: [sourceUrl] });
    await expect(screen.getByTestId('settings-screen')).toBeVisible();
  } finally {
    await client.call('configure_source_code_browser', { mode: 'native' });
    client.close();
  }
});


test('source code opens the native browser and returns to Settings', async ({ app, device, screen, platform }) => {
  await prepareAppductApp({ app, device, screen });
  const session = await link({ scheme: 'youmotion' });
  const bootstrapUrl = new URL(session.deepLink);
  bootstrapUrl.hostname = 'today';
  bootstrapUrl.pathname = '';
  await device.openLink(bootstrapUrl.toString());
  const openConfirmation = screen.getByRole('button', 'Open');
  if (await openConfirmation.isVisible()) await openConfirmation.tap();
  await expect(screen.getByTestId('today-screen')).toBeVisible();
  const client = await waitForSession<SourceTools>(session.sessionId, { timeoutMs: 30_000 });
  try {
    await expect.poll(async () => (await client.tools()).some((tool) => tool.name === 'configure_source_code_browser')).toBe(true);
    await client.call('configure_source_code_browser', { mode: 'native' });
    await screen.getByTestId('tab-settings').tap();
    await screen.scrollUntilVisible(screen.getByTestId('open-source-code'), { direction: 'down' });
    await screen.getByTestId('open-source-code').tap();
    await expect.poll(() => client.call('read_source_code_browser', {})).toEqual({ mode: 'native', urls: [sourceUrl] });
    await app.screenshot('source-code-native-browser');
    if (platform === 'ios') {
      await screen.getByRole('button', 'Close').tap();
    } else {
      await device.back();
    }
    await expect.poll(async () => {
      try {
        return await screen.getByTestId('settings-screen').isVisible();
      } catch (error) {
        if (error instanceof Error && error.message.includes('still finishing')) return false;
        throw error;
      }
    }, { timeout: 30_000, interval: 1_000 }).toBe(true);
    await expect(screen.getByTestId('source-code-error')).not.toBeVisible();
  } finally {
    client.close();
  }
});
