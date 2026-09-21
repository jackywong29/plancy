/**
 * Give the widget extension its own privacy manifest.
 *
 * Apple wants a `PrivacyInfo.xcprivacy` in every bundle that calls a
 * required-reason API — the app, and separately each extension. The main app
 * has one (Expo generates it), but `ExpoWidgetsTarget` is its own bundle and
 * gets nothing: `expo-widgets` ships no manifest of its own, and its
 * `ios/WidgetsStorage.swift` reads the app group through
 * `UserDefaults(suiteName:)`, which is a required-reason API.
 *
 * A missing manifest is an automated rejection when the build is uploaded, not
 * a note during review, so it has to be right before the first submission.
 *
 * `ios/` is generated and gitignored, so this cannot be a hand edit — it runs
 * on every prebuild. Two steps: write the file, then add it to the widget
 * target's Copy Bundle Resources, since a file Xcode doesn't copy may as well
 * not exist.
 *
 * **Register this ahead of `expo-widgets` in app.json.** Expo runs a later
 * registered `withXcodeProject` mod *earlier*, so being listed first is what
 * makes this run last, once the widget target actually exists. Listed after
 * expo-widgets it runs first, finds no target, and fails the prebuild.
 *
 * Delete this plugin if expo-widgets ever ships a manifest of its own.
 */
const fs = require('fs');
const path = require('path');

const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');

const TARGET = 'ExpoWidgetsTarget';
const FILE = 'PrivacyInfo.xcprivacy';

/**
 * CA92.1 is "access user defaults to read and write information that is only
 * accessible to the app itself and its app group" — exactly what the widget
 * does. Nothing else in the extension touches a required-reason API, so
 * nothing else is declared: an over-broad manifest is its own kind of wrong.
 */
const MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>NSPrivacyAccessedAPITypes</key>
\t<array>
\t\t<dict>
\t\t\t<key>NSPrivacyAccessedAPIType</key>
\t\t\t<string>NSPrivacyAccessedAPICategoryUserDefaults</string>
\t\t\t<key>NSPrivacyAccessedAPITypeReasons</key>
\t\t\t<array>
\t\t\t\t<string>CA92.1</string>
\t\t\t</array>
\t\t</dict>
\t</array>
\t<key>NSPrivacyCollectedDataTypes</key>
\t<array/>
\t<key>NSPrivacyTracking</key>
\t<false/>
\t<key>NSPrivacyTrackingDomains</key>
\t<array/>
</dict>
</plist>
`;

function withWidgetPrivacyManifest(config) {
  config = withDangerousMod(config, [
    'ios',
    async (c) => {
      // expo-widgets creates this folder in a dangerous mod of its own, and
      // the two can run in either order, so make the folder rather than
      // depending on it. expo-widgets only ever adds to it.
      const dir = path.join(c.modRequest.platformProjectRoot, TARGET);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, FILE), MANIFEST);
      return c;
    },
  ]);

  config = withXcodeProject(config, (c) => {
    const project = c.modResults;

    const targets = project.pbxNativeTargetSection();
    const uuid = Object.keys(targets).find(
      (key) => !key.endsWith('_comment') && targets[key]?.name?.replace(/"/g, '') === TARGET,
    );
    if (!uuid) {
      throw new Error(`with-widget-privacy-manifest: no "${TARGET}" target in the Xcode project.`);
    }

    // The widget target is built with Sources and Frameworks phases only —
    // expo-widgets never gives it a Resources phase, because until now it had
    // no resources. `addResourceFile` is no use here: it resolves the phase by
    // the name "Resources" across the whole project, which finds the *app's*
    // phase and would bundle the manifest into the wrong target.
    const phases = project.hash.project.objects.PBXResourcesBuildPhase ?? {};
    const own = new Set((targets[uuid].buildPhases ?? []).map((b) => b.value));
    const existing = Object.keys(phases).find((key) => !key.endsWith('_comment') && own.has(key));

    const relative = `${TARGET}/${FILE}`;
    if (!existing) {
      project.addBuildPhase([relative], 'PBXResourcesBuildPhase', 'Resources', uuid);
      return c;
    }
    // Re-running a prebuild without --clean must not copy the file twice.
    const already = (phases[existing].files ?? []).some((f) => String(f.comment).startsWith(FILE));
    if (!already) project.addBuildPhase([relative], 'PBXResourcesBuildPhase', 'Resources', uuid);
    return c;
  });

  return config;
}

module.exports = withWidgetPrivacyManifest;
