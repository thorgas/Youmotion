const developmentProfile = process.env.EAS_BUILD_PROFILE === undefined
  || process.env.EAS_BUILD_PROFILE === 'development'
  || process.env.EAS_BUILD_PROFILE === 'development-simulator';
const tracyEnabled = developmentProfile && process.env.EXPO_PUBLIC_ENABLE_TRACY === 'true';

module.exports = {
  dependencies: {
    '@ottrelite/backend-wrapper-tracy': {
      platforms: {
        ios: tracyEnabled ? { configurations: ['Debug'] } : null,
        android: tracyEnabled ? {} : null,
      },
    },
  },
};
