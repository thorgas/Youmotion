const { resolveUpdatesConfig } = require('expo-update-kit/config');

function resolveUpdates(config) {
  return resolveUpdatesConfig(config.updates, {
    channel: process.env.MOBILE_UPDATE_CHANNEL?.trim(),
  });
}

module.exports = { resolveUpdates };
