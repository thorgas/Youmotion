const { getDefaultConfig } = require('expo/metro-config');
const { withInspector } = require('@callstack/inspector/metro');
const { withRozenite } = require('@rozenite/metro');
const { withRozeniteRequireProfiler } = require('@rozenite/require-profiler-plugin/metro');
const { withReactNativeGrab } = require('react-native-grab/metro');

const defaultConfig = getDefaultConfig(__dirname);
const grabConfig = withReactNativeGrab(defaultConfig);
const rozeniteConfig = withRozenite(grabConfig, {
  enabled: process.env.WITH_ROZENITE === 'true',
  enhanceMetroConfig: withRozeniteRequireProfiler,
});
const inspectorEnabled = process.env.WITH_INSPECTOR === 'true';

module.exports = inspectorEnabled ? withInspector(rozeniteConfig, true)() : rozeniteConfig;
