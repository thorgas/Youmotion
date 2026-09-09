import { config as sharedConfig } from './goldie.config.ts';

const androidAppPath = process.env['GOLDIE_ANDROID_APP_PATH'];
const locale = process.env['GOLDIE_LOCALE'] ?? 'en-US';
const scene = process.env['GOLDIE_SCENE'];

if (!androidAppPath) throw new Error('GOLDIE_ANDROID_APP_PATH must point to the release APK.');
if (locale !== 'en-US' && locale !== 'de-DE') {
  throw new Error('GOLDIE_LOCALE must be en-US or de-DE.');
}
if (scene && !sharedConfig.scenes.some((candidate) => candidate.id === scene)) {
  throw new Error(`GOLDIE_SCENE does not match a configured scene: ${scene}`);
}

const config = {
  ...sharedConfig,
  appPath: undefined,
  devices: ['pixel-10-pro'],
  locales: [locale],
  scenes: sharedConfig.scenes.filter((candidate) => !scene || candidate.id === scene).map((candidate) => {
    if (candidate.id === 'onboarding' && locale === 'de-DE') {
      return Object.assign({}, candidate, { flow: 'store-01-pulse-de' });
    }
    if (candidate.id === 'today') {
      return Object.assign({}, candidate, {
        flow: locale === 'de-DE' ? 'store-02-today-android-de' : 'store-02-today-android',
      });
    }
    if (locale === 'de-DE' && candidate.id === 'history') {
      return Object.assign({}, candidate, { flow: 'store-03-history-de' });
    }
    if (locale === 'de-DE' && candidate.id === 'insights') {
      return Object.assign({}, candidate, { flow: 'store-04-insights-de' });
    }
    if (locale === 'de-DE' && candidate.id === 'settings') {
      return Object.assign({}, candidate, { flow: 'store-05-settings-de' });
    }
    return candidate;
  }),
  android: {
    appPath: androidAppPath,
    applicationId: 'com.youmotion.mobile',
  },
};

export default config;
