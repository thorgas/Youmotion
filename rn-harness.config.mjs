import {
  androidEmulator,
  androidPlatform,
  physicalAndroidDevice,
} from '@react-native-harness/platform-android';
import { applePlatform, appleSimulator } from '@react-native-harness/platform-apple';
import { chrome, webPlatform } from '@react-native-harness/platform-web';

const metroPort = process.env.RN_HARNESS_METRO_PORT ?? '8081';
const webPort = process.env.RN_HARNESS_WEB_PORT ?? metroPort;
const androidAvdName = process.env.RN_HARNESS_ANDROID_AVD ?? 'Pixel_9';

export default {
  entryPoint: './entry.tsx',
  appRegistryComponentName: 'main',
  metroPort: Number(metroPort),
  runners: [
    webPlatform({ name: 'web', browser: chrome(`http://localhost:${webPort}/index.html`) }),
    applePlatform({
      name: 'ios',
      device: appleSimulator('iPhone 17 Pro', '26.1'),
      bundleId: 'com.youmotion.mobile',
      appLaunchOptions: {
        arguments: [
          '--initialUrl', `http://localhost:${metroPort}`,
          '-EXDevMenuIsOnboardingFinished', 'YES',
          '-EXDevMenuShowsAtLaunch', 'NO',
        ],
      },
    }),
    androidPlatform({
      name: 'android',
      device: androidEmulator(androidAvdName, {
        apiLevel: 36,
        profile: 'pixel_9',
        diskSize: '2G',
        heapSize: '512M',
        snapshot: { enabled: true },
      }),
      bundleId: 'com.youmotion.mobile',
    }),
    androidPlatform({
      name: 'android-pixel-6a',
      device: physicalAndroidDevice('Google', 'Pixel 6a'),
      bundleId: 'com.youmotion.mobile',
    }),
  ],
  defaultRunner: 'web',
  forwardClientLogs: true,
};
