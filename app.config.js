const { execFileSync } = require('node:child_process');
const { IOSConfig, withXcodeProject } = require('expo/config-plugins');
const { resolveUpdatesConfig } = require('expo-update-kit/config');

function resolveGitCommit() {
  const easBuildCommit = process.env.EAS_BUILD_GIT_COMMIT_HASH;
  if (easBuildCommit) return easBuildCommit;

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function isLocallyBuiltBinary() {
  return process.env.EAS_BUILD_PROFILE === undefined;
}

function resolveUpdates(config) {
  return resolveUpdatesConfig(config.updates, {
    channel: process.env.MOBILE_UPDATE_CHANNEL?.trim(),
    disableByDefault: isLocallyBuiltBinary(),
  });
}

function withArm64Simulator(config) {
  return withXcodeProject(config, (projectConfig) => {
    const nativeTargets = IOSConfig.Target.getNativeTargets(projectConfig.modResults);

    for (const [, target] of nativeTargets) {
      const configurations = IOSConfig.XcodeUtils.getBuildConfigurationsForListId(
        projectConfig.modResults,
        target.buildConfigurationList,
      );

      for (const [, buildConfiguration] of configurations) {
        buildConfiguration.buildSettings.ARCHS = 'arm64';
      }
    }

    return projectConfig;
  });
}

module.exports = ({ config }) => {
  const updates = resolveUpdates(config);

  return {
    ...config,
    ...(updates === undefined ? {} : { updates }),
    plugins: [...(config.plugins ?? []), withArm64Simulator],
    extra: {
      ...config.extra,
      gitCommit: resolveGitCommit(),
    },
  };
};
