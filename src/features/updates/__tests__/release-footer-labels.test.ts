import { appSettingsStore } from '@/features/settings/application/app-settings.store';
import { configureAppLocale } from '@/localization/app-locale.configuration';
import { releaseFooterLabels } from '../ui/release-footer-labels';

configureAppLocale(appSettingsStore);

describe('releaseFooterLabels', () => {
  const labels = releaseFooterLabels();

  it('names the channel the binary is currently on', () => {
    expect(labels.title('qa')).toBe('Updates · QA');
    expect(labels.title('production')).toBe('Updates · Production');
  });

  it('labels every action id the kit can offer', () => {
    expect(labels.action('check')).toBe('Check for update now');
    expect(labels.action('switch-to-qa')).toBe('Switch to QA');
    expect(labels.action('switch-to-production')).toBe('Switch to production');
  });

  it('offers a cancel label for the native sheet', () => {
    expect(labels.cancel).toBe('Cancel');
  });

  it('explains a disabled build rather than reporting a failure', () => {
    expect(labels.outcome({ kind: 'disabled' })).toEqual({
      message: 'This is a development or dev-client build; expo-updates never checks here.',
      title: 'Updates are disabled in this build',
    });
  });

  it('shows the first eight characters of the running update id', () => {
    expect(labels.outcome({ kind: 'up-to-date', updateId: '0123456789abcdef' })).toEqual({
      title: 'You’re up to date · 01234567',
    });
  });

  it('reports an embedded launch with no update id as none', () => {
    expect(labels.outcome({ kind: 'up-to-date', updateId: null })).toEqual({
      title: 'You’re up to date · none',
    });
  });

  it('passes the failure message through verbatim', () => {
    expect(labels.outcome({ kind: 'error', message: 'Network request failed' })).toEqual({
      message: 'Network request failed',
      title: 'Update check failed',
    });
  });

  it('shows nothing while the app is already reloading', () => {
    expect(labels.outcome({ kind: 'reloading' })).toBeNull();
  });
});
