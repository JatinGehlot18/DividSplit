#!/usr/bin/env bash
# Builds a release APK and installs it on the connected Android device — a
# standalone build (JS bundled via Hermes), unlike android:dev/android:staging
# which need Metro running. Useful for handing someone a build to test, or
# checking release-mode behavior (cold start, signing, no dev overlay) that
# the Metro-backed dev build hides.
#
# Usage: scripts/install-apk.sh [dev|staging|prod]   (default: staging)
# If multiple devices/emulators are attached, set ANDROID_SERIAL to pick one
# (see `adb devices`).
set -euo pipefail
cd "$(dirname "$0")/.."

ENV="${1:-staging}"
ENVFILE=".env.$ENV"
if [ ! -f "$ENVFILE" ]; then
  echo "No $ENVFILE — pass dev, staging, or prod." >&2
  exit 1
fi

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }

step "Checking for a connected device"
DEVICES=$(adb devices | awk 'NR>1 && $2=="device" {print $1}')
COUNT=$(printf '%s\n' "$DEVICES" | grep -c . || true)
if [ "$COUNT" -eq 0 ]; then
  echo "No device/emulator connected (adb devices shows none). Plug one in with USB debugging enabled, or start an emulator." >&2
  exit 1
elif [ "$COUNT" -gt 1 ]; then
  if [ -z "${ANDROID_SERIAL:-}" ]; then
    echo "Multiple devices connected — set ANDROID_SERIAL to pick one:" >&2
    printf '%s\n' "$DEVICES" | sed 's/^/  /' >&2
    exit 1
  fi
  SERIAL="$ANDROID_SERIAL"
else
  SERIAL="${ANDROID_SERIAL:-$DEVICES}"
fi
echo "Target device: $SERIAL"

# A version code tied to the current time is always higher than whatever's
# already installed, so this never trips Android's "same package, lower
# versionCode" install rejection when testing repeatedly on one device.
VERSION_CODE=$(date +%s)

step "Building release APK ($ENVFILE, versionCode $VERSION_CODE)"
(cd android && ENVFILE="$ENVFILE" ./gradlew assembleRelease -PversionCode="$VERSION_CODE" -PversionName="$ENV-$VERSION_CODE")

APK="android/app/build/outputs/apk/release/app-release.apk"

step "Installing on $SERIAL"
adb -s "$SERIAL" install -r "$APK"

step "Launching"
adb -s "$SERIAL" shell am start -n com.splitkaro/.MainActivity >/dev/null

echo "Done — installed and launched on $SERIAL."
