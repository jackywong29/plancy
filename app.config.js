/**
 * app.json holds the real App Store setup. This file adjusts it in code.
 *
 * Every build: no push notification entitlement. plancy never asks for a
 * push token; reminders and nudges are local notifications, which don't need
 * `aps-environment`. (expo-notifications adds the entitlement by default.)
 *
 * Phone build only (PLANCY_PHONE, set by scripts/install-on-iphone.sh): a
 * build installed on Jacky's own iPhone with a free Apple ID (no paid
 * developer account yet).
 * - A separate bundle id, so the free team never claims com.clancyhq.plancy,
 *   which Clancy's paid account needs later.
 * - extra.testTools shows Settings → Testing (load sample data, erase all).
 * - PLANCY_TEAM, when known, is the free team's id, so Xcode signs the build
 *   without anyone picking a team by hand.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

const withoutPush = (c) =>
  withEntitlementsPlist(c, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });

module.exports = ({ config }) => {
  if (!process.env.PLANCY_PHONE) return withoutPush(config);

  return withoutPush({
    ...config,
    extra: { ...config.extra, testTools: true },
    ios: {
      ...config.ios,
      bundleIdentifier: 'com.clancyhq.plancy.dev',
      ...(process.env.PLANCY_TEAM ? { appleTeamId: process.env.PLANCY_TEAM } : {}),
    },
  });
};
