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
set -e
cd "$(dirname "$0")/.."
. scripts/ios-env.sh

export PLANCY_PHONE=1
export PLANCY_TEAM=TN5SQM7946
IPHONE=00008150-000A41D1116A401C

npx expo prebuild --platform ios --clean
npx expo run:ios --device "$IPHONE" --configuration Release
