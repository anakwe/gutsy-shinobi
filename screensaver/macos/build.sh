#!/bin/bash
# Build the offline web payload and a universal macOS 12+ screensaver bundle.
# Requires npm dependencies and Xcode tools; does not install or change OS settings.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/screensaver/build/macos/Gutsy Shinobi.saver"
(cd "$ROOT/frontend" && npm run build:screensaver)
mkdir -p "$OUT/Contents/MacOS" "$OUT/Contents/Resources/Web"
cp "$ROOT/screensaver/macos/Info.plist" "$OUT/Contents/Info.plist"
cp "$ROOT/frontend/dist-screensaver/"{index.html,screensaver.js,screensaver.css} "$OUT/Contents/Resources/Web/"
xcrun clang -fobjc-arc -Wall -Wextra -Werror -Wno-unused-parameter -bundle \
  -arch arm64 -arch x86_64 -mmacosx-version-min=12.0 \
  -framework Cocoa -framework ScreenSaver -framework WebKit \
  "$ROOT/screensaver/macos/GutsyView.m" -o "$OUT/Contents/MacOS/GutsyShinobi"
# CODESIGN_IDENTITY selects an existing keychain identity; no credentials are read
# from repository files. The default ad-hoc signature is for local verification.
# A distributed release still needs Developer ID signing and notarization.
codesign --force --sign "${CODESIGN_IDENTITY:--}" "$OUT"
codesign --verify --strict "$OUT"
printf '%s\n' "Built: $OUT"
