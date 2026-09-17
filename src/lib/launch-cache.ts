/**
 * iOS keeps a picture of an app's launch screen in the app's own
 * Library/SplashBoard folder and shows that picture at launch, even after an
 * update changes the real launch screen. That is how the old Expo logo kept
 * cross-fading into the new mark.
 *
 * Whenever the build number changes, plancy deletes that saved picture once,
 * so iOS takes a fresh one of the current launch screen. Bump
 * `ios.buildNumber` in app.json whenever the icon or launch screen changes.
 *
 * (Notification and Spotlight icons live in a system-wide cache no app can
 * clear; restarting the iPhone refreshes those.)
 */
import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';

export function refreshLaunchScreenCache(): void {
  try {
    const build = String(Constants.expoConfig?.ios?.buildNumber ?? '');
    const marker = new File(Paths.document, '.launch-screen-build');
    if (marker.exists && marker.textSync() === build) return;

    const library = Paths.document.parentDirectory;
    for (const name of ['SplashBoard', 'Caches/Snapshots']) {
      const cached = new Directory(library, 'Library', name);
      if (cached.exists) cached.delete();
    }
    if (!marker.exists) marker.create();
    marker.write(build);
  } catch {
    // Worst case iOS shows the old picture for one more launch.
  }
}
