import { appSettingsStore } from '@/app-stores';
import { configureAppLocale } from '@/localization/app-locale.configuration';
import type { UpdateKitAction, UpdateOutcome } from 'expo-update-kit';
import { releaseFooterLabels } from '../ui/release-footer-labels';

configureAppLocale(appSettingsStore);

const run = (): Promise<UpdateOutcome> => Promise.resolve({ kind: 'reloading' });
const switchTo = (channel: string): UpdateKitAction => ({ channel, id: 'switch', run });

describe('releaseFooterLabels', () => {
  const labels = releaseFooterLabels();

  it('names the channel the binary currently follows', () => {
    expect(labels.title('production')).toBe('Updates · Production');
    expect(labels.title('testing')).toBe('Updates · Testing');
    expect(labels.title('qa')).toBe('Updates · QA');
  });

  it('shows an unknown channel by its raw name rather than hiding it', () => {
    expect(labels.title('preview')).toBe('Updates · preview');
  });

  it('labels the check action and one switch action per channel', () => {
    expect(labels.action({ id: 'check', run })).toBe('Check for update now');
    expect(labels.action(switchTo('qa'))).toBe('Switch to QA');
    expect(labels.action(switchTo('testing'))).toBe('Switch to Testing');
    expect(labels.action(switchTo('production'))).toBe('Switch to Production');
  });

  it('offers cancel and more labels for the native menus', () => {
    expect(labels.cancel).toBe('Cancel');
    expect(labels.more).toBe('More channels…');
  });

  it('explains a disabled build rather than reporting a failure', () => {
    expect(labels.outcome({ kind: 'disabled' })).toEqual({
      message: 'This is a development or dev-client build; expo-updates never checks here.',
      title: 'Updates are disabled in this build',
    });
  });

  it('confirms a switch that applied without a reload', () => {
    expect(labels.outcome({ channel: 'qa', kind: 'switched', reloaded: false, updateId: null })).toEqual({
      message: 'The next update check or app launch uses this channel.',
      title: 'Switched to QA',
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
