import { androidEmulator, androidPlatform } from '@react-native-harness/platform-android';
import { applePlatform, appleSimulator } from '@react-native-harness/platform-apple';
import { chrome, webPlatform } from '@react-native-harness/platform-web';

const webPort = process.env.RN_HARNESS_WEB_PORT ?? '8081';

export default {
  entryPoint: './entry.tsx',
  appRegistryComponentName: 'main',
  runners: [
    webPlatform({ name: 'web', browser: chrome(`http://localhost:${webPort}/index.html`) }),
    applePlatform({
      name: 'ios',
      device: appleSimulator('iPhone 17 Pro', '26.1'),
      bundleId: 'com.youmotion.mobile',
    }),
    androidPlatform({
      name: 'android',
      device: androidEmulator('Pixel_9'),
      bundleId: 'com.youmotion.mobile',
    }),
  ],
  defaultRunner: 'web',
  forwardClientLogs: true,
};
