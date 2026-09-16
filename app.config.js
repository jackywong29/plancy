/**
 * app.json holds the real App Store setup. This file only changes it for a
 * build installed on Jacky's own iPhone with a free Apple ID (no paid
 * developer account yet). scripts/install-on-iphone.sh sets PLANCY_PHONE.
 *
 * - A separate bundle id, so the free team never claims com.clancyhq.plancy,
 *   which Clancy's paid account needs later.
 * - No push notification entitlement: free teams can't have it. Reminders
 *   are local notifications and still work without it.
 * - extra.testTools shows Settings → Testing (load sample data, erase all).
 * - PLANCY_TEAM, when known, is the free team's id, so Xcode signs the build
 *   without anyone picking a team by hand.
 *
 * Without PLANCY_PHONE nothing changes.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = ({ config }) => {
  if (!process.env.PLANCY_PHONE) return config;

  const withoutPush = (c) =>
    withEntitlementsPlist(c, (mod) => {
      delete mod.modResults['aps-environment'];
      return mod;
    });

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
