const { withEntitlementsPlist } = require('expo/config-plugins');

const PUSH_NOTIFICATIONS_ENTITLEMENT = 'aps-environment';

module.exports = function withoutPushNotificationsEntitlement(config) {
  return withEntitlementsPlist(config, (entitlementsConfig) => {
    delete entitlementsConfig.modResults[PUSH_NOTIFICATIONS_ENTITLEMENT];
    return entitlementsConfig;
  });
};
