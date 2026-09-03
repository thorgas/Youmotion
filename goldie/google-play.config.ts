import { config as sharedConfig } from './goldie.config.ts';

const androidAppPath = process.env['GOLDIE_ANDROID_APP_PATH'];
const locale = process.env['GOLDIE_LOCALE'] ?? 'en-US';

if (!androidAppPath) throw new Error('GOLDIE_ANDROID_APP_PATH must point to the release APK.');
if (locale !== 'en-US' && locale !== 'de-DE') {
  throw new Error('GOLDIE_LOCALE must be en-US or de-DE.');
}

const config = {
  ...sharedConfig,
  appPath: undefined,
  devices: ['pixel-10-pro'],
  locales: [locale],
  scenes: sharedConfig.scenes.map((scene) => {
    if (scene.id === 'onboarding' && locale === 'de-DE') {
      return Object.assign({}, scene, { flow: 'store-01-pulse-de' });
    }
    if (scene.id === 'today') {
      return Object.assign({}, scene, {
        flow: locale === 'de-DE' ? 'store-02-today-android-de' : 'store-02-today-android',
      });
    }
    if (locale === 'de-DE' && scene.id === 'history') {
      return Object.assign({}, scene, { flow: 'store-03-history-de' });
    }
    if (locale === 'de-DE' && scene.id === 'insights') {
      return Object.assign({}, scene, { flow: 'store-04-insights-de' });
    }
    if (locale === 'de-DE' && scene.id === 'settings') {
      return Object.assign({}, scene, { flow: 'store-05-settings-de' });
    }
    return scene;
  }),
  android: {
    appPath: androidAppPath,
    applicationId: 'com.youmotion.mobile',
  },
};

export default config;
