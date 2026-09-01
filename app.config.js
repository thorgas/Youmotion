const { execFileSync } = require('node:child_process');

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

module.exports = ({ config }) => ({
  ...config,
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
