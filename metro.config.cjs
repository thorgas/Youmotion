const fs = require('node:fs');
const path = require('node:path');

const { getDefaultConfig } = require('expo/metro-config');
const { withInspector } = require('@callstack/inspector/metro');
const { withRozenite } = require('@rozenite/metro');
const { withRozeniteRequireProfiler } = require('@rozenite/require-profiler-plugin/metro');
const { withReactNativeGrab } = require('react-native-grab/metro');

const defaultConfig = getDefaultConfig(__dirname);
const surrealDbPackageRoot = fs.realpathSync(
  path.join(__dirname, 'node_modules/react-native-surrealdb'),
);
const surrealDbWorkspaceRoot = path.resolve(surrealDbPackageRoot, '../..');

defaultConfig.watchFolders = [...defaultConfig.watchFolders, surrealDbWorkspaceRoot];
defaultConfig.resolver.nodeModulesPaths = [
  path.join(__dirname, 'node_modules'),
  ...defaultConfig.resolver.nodeModulesPaths,
];

const grabConfig = withReactNativeGrab(defaultConfig);
const rozeniteConfig = withRozenite(grabConfig, {
  enabled: process.env.WITH_ROZENITE === 'true',
  enhanceMetroConfig: withRozeniteRequireProfiler,
});
const inspectorEnabled = process.env.WITH_INSPECTOR === 'true';

module.exports = inspectorEnabled ? withInspector(rozeniteConfig, true)() : rozeniteConfig;
