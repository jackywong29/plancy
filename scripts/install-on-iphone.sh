#!/bin/sh
# Builds plancy and installs it on Jacky's iPhone over the cable.
#
# Signed with Jacky's free Apple ID (personal team), because Clancy's paid
# developer account doesn't exist yet. Apps signed this way stop opening
# after 7 days; run this again to reinstall. Data in the app is kept.
#
#   sh scripts/install-on-iphone.sh
#
# The team id and the iPhone's UDID are not committed. Put them in .env.local
# (gitignored) or the environment:
#
#   PLANCY_TEAM=XXXXXXXXXX              # Xcode → Settings → Accounts
#   IPHONE=XXXXXXXX-XXXXXXXXXXXXXXXX    # xcrun devicectl list devices
#
# The iPhone must be plugged in, unlocked, with Developer Mode on.
# This regenerates ios/ in "phone" mode (see app.config.js). To go back to
# the simulator setup afterwards: PLANCY_DEV=1 npx expo prebuild --platform ios --clean
#
# xcodebuild is called directly rather than through `expo run:ios` so that
# -allowProvisioningUpdates can refresh the free team's profiles whenever an
# entitlement changes (the widget added App Groups) and sign the widget
# extension too.
set -e
set -o pipefail
cd "$(dirname "$0")/.."
. scripts/ios-env.sh

# Only these two keys are read, so nothing else in .env.local leaks in.
if [ -f .env.local ]; then
  [ -n "$PLANCY_TEAM" ] || PLANCY_TEAM=$(sed -n 's/^PLANCY_TEAM=//p' .env.local | tail -n 1)
  [ -n "$IPHONE" ] || IPHONE=$(sed -n 's/^IPHONE=//p' .env.local | tail -n 1)
fi
[ -n "$PLANCY_TEAM" ] || { echo "Set PLANCY_TEAM (in .env.local or the environment)."; exit 1; }
[ -n "$IPHONE" ] || { echo "Set IPHONE to the iPhone's UDID (in .env.local or the environment)."; exit 1; }

export PLANCY_PHONE=1
export PLANCY_TEAM
BUNDLE=com.clancyhq.plancy.dev
# Outside ios/, which prebuild --clean deletes, so later builds reuse the cache.
DERIVED="$HOME/.plancy-tools/phone-build"
APP="$DERIVED/Build/Products/Release-iphoneos/plancy.app"
# A failed build must not install the previous one.
rm -rf "$APP"

npx expo prebuild --platform ios --clean

xcodebuild \
  -workspace ios/plancy.xcworkspace \
  -scheme plancy \
  -configuration Release \
  -destination "id=$IPHONE" \
  -derivedDataPath "$DERIVED" \
  -allowProvisioningUpdates \
  -allowProvisioningDeviceRegistration \
  DEVELOPMENT_TEAM="$PLANCY_TEAM" \
  CODE_SIGN_STYLE=Automatic \
  build | { grep -E "error|warning: .*(sign|profile)|BUILD|Signing|Touch .*\.app" || true; }

[ -d "$APP" ] || { echo "Build did not produce $APP"; exit 1; }

xcrun devicectl device install app --device "$IPHONE" "$APP"
xcrun devicectl device process launch --terminate-existing --device "$IPHONE" "$BUNDLE" || \
  echo "Installed. If it won't open: Settings → General → VPN & Device Management → trust the Apple ID."
