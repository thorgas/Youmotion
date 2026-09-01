const { execFileSync } = require('node:child_process');
const { IOSConfig, withXcodeProject } = require('expo/config-plugins');

function resolveGitCommit() {
  const easBuildCommit = process.env.EAS_BUILD_GIT_COMMIT_HASH;
  if (easBuildCommit) return easBuildCommit;

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

const isProductionBuild = process.env.EAS_BUILD_PROFILE === 'production';
const harnessUiPackage = '@react-native-harness/ui';

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

module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins ?? []), withArm64Simulator],
  extra: {
    ...config.extra,
    gitCommit: resolveGitCommit(),
  },
  autolinking: {
    ...config.autolinking,
    ios: {
      ...config.autolinking?.ios,
      ...(isProductionBuild
        ? {
            exclude: [
              ...(config.autolinking?.ios?.exclude ?? []),
              harnessUiPackage,
            ],
          }
        : {}),
    },
  },
});
