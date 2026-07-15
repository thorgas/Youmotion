import { androidEmulator, androidPlatform } from '@react-native-harness/platform-android';
import { applePlatform, appleSimulator } from '@react-native-harness/platform-apple';
import { chrome, webPlatform } from '@react-native-harness/platform-web';

export default {
  entryPoint: './entry.tsx',
  appRegistryComponentName: 'main',
  runners: [
    webPlatform({ name: 'web', browser: chrome('http://localhost:8081/index.html') }),
    applePlatform({
      name: 'ios',
      device: appleSimulator('iPhone 17 Pro', '26.1'),
      bundleId: 'app.youmotion.mobile',
    }),
    androidPlatform({
      name: 'android',
      device: androidEmulator('Pixel_9'),
      bundleId: 'app.youmotion.mobile',
    }),
  ],
  defaultRunner: 'web',
  forwardClientLogs: true,
};
