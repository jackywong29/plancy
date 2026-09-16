#!/bin/sh
# Puts CocoaPods on the PATH for this shell.
#
# The Mac's system Ruby (2.6) is too old for CocoaPods and Homebrew cannot
# build a newer one on this macOS without updated Command Line Tools, so
# CocoaPods was installed into a private folder using the Ruby that Homebrew
# ships for itself. Source this file before `npx expo run:ios`:
#
#   . scripts/ios-env.sh && npx expo run:ios
#
# Once Command Line Tools for Xcode 27 are installed from Software Update,
# `brew install cocoapods` works and this file is no longer needed.

RUBY_HOME="$HOME/.homebrew/Library/Homebrew/vendor/portable-ruby/current"
export GEM_HOME="$HOME/.plancy-tools/gems"
export GEM_PATH="$GEM_HOME"
export PATH="$GEM_HOME/bin:$RUBY_HOME/bin:$PATH"
export LANG="${LANG:-en_US.UTF-8}"
