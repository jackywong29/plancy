/**
 * Drop Info.plist keys plancy doesn't need.
 *
 * Neither is a vulnerability — the app makes no network requests at all — but
 * a shipped binary shouldn't declare capabilities it never uses, and a
 * reviewer reading the plist shouldn't have to wonder why they're there.
 *
 * - `NSSupportsLiveActivities` / `…FrequentUpdates` are set by expo-widgets.
 *   plancy has no Live Activities, so these go in every build. **This plugin
 *   must be registered ahead of `expo-widgets` in app.json**: Expo runs a
 *   later-registered Info.plist mod *earlier*, so listed after it the keys are
 *   deleted and then written straight back.
 *
 * - `NSAllowsLocalNetworking` is Expo's, and it is how the app is allowed to
 *   reach Metro over cleartext while you're developing. It is removed by
 *   default, so a store build can't ship it by someone forgetting a flag. It
 *   is kept only for a development build (PLANCY_DEV=1, which `npm run ios`
 *   sets) or a phone build (PLANCY_PHONE, set by install-on-iphone.sh). The
 *   plugin says which mode it ran in, so the prebuild output shows it.
 */
const { withInfoPlist } = require('expo/config-plugins');

function withStoreHygiene(config) {
  return withInfoPlist(config, (c) => {
    delete c.modResults.NSSupportsLiveActivities;
    delete c.modResults.NSSupportsLiveActivitiesFrequentUpdates;

    const dev = process.env.PLANCY_DEV === '1' || Boolean(process.env.PLANCY_PHONE);
    const ats = c.modResults.NSAppTransportSecurity;
    if (!dev && ats && typeof ats === 'object') {
      delete ats.NSAllowsLocalNetworking;
    }
    console.log(
      dev
        ? '  with-store-hygiene: development/phone build — local networking kept for Metro.'
        : '  with-store-hygiene: local networking removed. Set PLANCY_DEV=1 (npm run ios does) to reach Metro.',
    );
    return c;
  });
}

module.exports = withStoreHygiene;
