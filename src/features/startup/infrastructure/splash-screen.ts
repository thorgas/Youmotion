import * as SplashScreen from 'expo-splash-screen';

const _ignoreSplashFailure = () => undefined;

export const holdNativeSplash = () => {
  void SplashScreen.preventAutoHideAsync().catch(_ignoreSplashFailure);
};

export const hideNativeSplash = () => {
  SplashScreen.hide();
};
