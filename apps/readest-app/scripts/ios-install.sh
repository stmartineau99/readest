#!/usr/bin/env bash
# Build a debug iOS bundle signed with the personal team and install it on the
# connected iPhone. Rerun weekly: free-team signatures expire after 7 days.
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/opt/homebrew/opt/rustup/bin:$PATH"
export LANG=en_US.UTF-8

device=$(idevice_id -l | head -n 1)
if [ -z "$device" ]; then
  echo "No iPhone connected: plug it in and unlock it." >&2
  exit 1
fi

pnpm tauri ios build --debug
xcrun devicectl device install app --device "$device" src-tauri/gen/apple/build/arm64/Readest.ipa
