#!/bin/sh
# Builds plancy and installs it on Jacky's iPhone over the cable.
#
# Signed with Jacky's free Apple ID (personal team), because Clancy's paid
# developer account doesn't exist yet. Apps signed this way stop opening
# after 7 days; run this again to reinstall. Data in the app is kept.
#
#   sh scripts/install-on-iphone.sh
#
# The iPhone must be plugged in, unlocked, with Developer Mode on.
# This regenerates ios/ in "phone" mode (see app.config.js). To go back to
# the simulator setup afterwards: npx expo prebuild --platform ios --clean
#
# xcodebuild is called directly rather than through `expo run:ios` so that
# -allowProvisioningUpdates can refresh the free team's profiles whenever an
# entitlement changes (the widget added App Groups) and sign the widget
# extension too.
set -e
cd "$(dirname "$0")/.."
. scripts/ios-env.sh

export PLANCY_PHONE=1
export PLANCY_TEAM=TN5SQM7946
IPHONE=00008150-000A41D1116A401C
BUNDLE=com.clancyhq.plancy.dev
DERIVED=ios/build

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
  build | grep -E "error|warning: .*(sign|profile)|BUILD|Signing|Touch .*\.app" || true

APP="$DERIVED/Build/Products/Release-iphoneos/plancy.app"
[ -d "$APP" ] || { echo "Build did not produce $APP"; exit 1; }

xcrun devicectl device install app --device "$IPHONE" "$APP"
xcrun devicectl device process launch --terminate-existing --device "$IPHONE" "$BUNDLE" || \
  echo "Installed. If it won't open: Settings → General → VPN & Device Management → trust the Apple ID."
