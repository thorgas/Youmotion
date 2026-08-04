const { getDefaultConfig } = require('expo/metro-config');
const { withInspector } = require('@callstack/inspector/metro');
const { withRozenite } = require('@rozenite/metro');
const { withRozeniteRequireProfiler } = require('@rozenite/require-profiler-plugin/metro');
const { withReactNativeGrab } = require('react-native-grab/metro');

const defaultConfig = getDefaultConfig(__dirname);
const harnessPresstoPath = require.resolve('./src/testing/pressto.harness.tsx');
const harnessReanimatedPath = require.resolve('./src/testing/react-native-reanimated.harness.tsx');
const tslibEsmPath = require.resolve('tslib/tslib.es6.mjs');
const harnessEnabled = process.env.RN_HARNESS_METRO_PORT !== undefined;

defaultConfig.resolver.resolveRequest = (...resolveRequestArguments) => {
  const [context, moduleName, platform] = resolveRequestArguments;
  if (harnessEnabled && moduleName === 'pressto') {
    return { filePath: harnessPresstoPath, type: 'sourceFile' };
  }
  if (harnessEnabled && moduleName === 'react-native-reanimated') {
    return { filePath: harnessReanimatedPath, type: 'sourceFile' };
  }
  if (moduleName === 'tslib') {
    return { filePath: tslibEsmPath, type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

const grabConfig = withReactNativeGrab(defaultConfig);
const rozeniteConfig = withRozenite(grabConfig, {
  enabled: process.env.WITH_ROZENITE === 'true',
  enhanceMetroConfig: withRozeniteRequireProfiler,
});
const inspectorEnabled = process.env.WITH_INSPECTOR === 'true';

module.exports = inspectorEnabled ? withInspector(rozeniteConfig, true)() : rozeniteConfig;
