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
 *   reach Metro over cleartext while you're developing. It only goes in a
 *   store build, because removing it everywhere would break `expo run:ios`.
 *   Set PLANCY_STORE=1 for the build you upload; the plugin says which mode
 *   it ran in, so a missed flag is visible in the prebuild output rather than
 *   discovered in the archive.
 */
const { withInfoPlist } = require('expo/config-plugins');

function withStoreHygiene(config) {
  return withInfoPlist(config, (c) => {
    delete c.modResults.NSSupportsLiveActivities;
    delete c.modResults.NSSupportsLiveActivitiesFrequentUpdates;

    const store = process.env.PLANCY_STORE === '1';
    const ats = c.modResults.NSAppTransportSecurity;
    if (store && ats && typeof ats === 'object') {
      delete ats.NSAllowsLocalNetworking;
    }
    console.log(
      store
        ? '  with-store-hygiene: store build — local networking removed.'
        : '  with-store-hygiene: development build — local networking kept for Metro. Set PLANCY_STORE=1 for the App Store build.',
    );
    return c;
  });
}

module.exports = withStoreHygiene;
