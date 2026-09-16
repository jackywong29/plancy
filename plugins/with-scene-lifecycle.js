/**
 * Adopt the UIScene life cycle.
 *
 * The iOS 27 SDK stops the app at launch (SIGTRAP in
 * UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption) unless the app
 * uses scenes. Expo 57 ships `ExpoAppSceneDelegate` for exactly this, but the
 * prebuild template (57.0.25 at the time of writing) still starts React Native
 * from the app delegate. This plugin does what the template will eventually do:
 *
 *  1. declares a scene manifest in Info.plist that points at Expo's delegate;
 *  2. makes AppDelegate conform to `ExpoReactNativeFactoryProvider` and stops
 *     it creating its own window, since the scene delegate now does that.
 *
 * Remove this plugin once `npx expo prebuild` generates scene support itself.
 */
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const WINDOW_BLOCK = /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n\s*withModuleName: "main",\n\s*in: window,\n\s*launchOptions: launchOptions\)\n#endif\n/;

function withSceneLifecycle(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return c;
  });

  config = withAppDelegate(config, (c) => {
    let src = c.modResults.contents;
    if (!src.includes('ExpoReactNativeFactoryProvider')) {
      src = src.replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
      );
    }
    if (!WINDOW_BLOCK.test(src)) {
      throw new Error(
        'with-scene-lifecycle: AppDelegate.swift changed shape; update the plugin (or delete it if the template now adopts scenes).',
      );
    }
    src = src.replace(
      WINDOW_BLOCK,
      '    // The window is created by ExpoAppSceneDelegate (see plugins/with-scene-lifecycle.js).\n',
    );
    c.modResults.contents = src;
    return c;
  });

  return config;
}

module.exports = withSceneLifecycle;
