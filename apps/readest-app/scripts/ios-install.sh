#!/usr/bin/env bash
# Build a debug iOS bundle signed with the personal team and install it on the
# connected iPhone. Rerun weekly: free-team signatures expire after 7 days.
# If ../../../builds exists (~/Documents/Chinese/builds), the log and .ipa are
# kept there in <date>_<commit>/, newest 5 .ipa files only.
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/opt/homebrew/opt/rustup/bin:$PATH"
export LANG=en_US.UTF-8

builds="$(cd ../../.. && pwd)/builds"
if [ -d "$builds" ]; then
  commit=$(git rev-parse --short HEAD)
  git diff --quiet HEAD || commit="$commit-dirty"
  out="$builds/$(date +%Y-%m-%d_%H%M)_$commit"
  mkdir -p "$out"
  exec > >(tee "$out/ios_build.txt") 2>&1
fi

device=$(idevice_id -l | head -n 1)
if [ -z "$device" ]; then
  echo "No iPhone connected: plug it in and unlock it." >&2
  exit 1
fi

# Back up the saved words before installing. Stops the build if the copy fails.
backups="$(cd ../../.. && pwd)/backups"
if [ -d "$backups" ]; then
  db="$backups/vocab_$(date +%Y-%m-%d_%H%M).db"
  xcrun devicectl device copy from --device "$device" --domain-type appDataContainer \
    --domain-identifier com.stmartineau.readest --source Documents/vocab.db --destination "$db"
  [ "$(sqlite3 "$db" 'pragma integrity_check')" = ok ] || { echo "Backup $db failed the integrity check." >&2; exit 1; }
  echo "Backed up vocab.db ($(sqlite3 "$db" 'select count(*) from words') words) to $db"
fi

pnpm tauri ios build --debug
xcrun devicectl device install app --device "$device" src-tauri/gen/apple/build/arm64/Readest.ipa

if [ -d "$builds" ]; then
  cp src-tauri/gen/apple/build/arm64/Readest.ipa "$out/"
  ls -1t "$builds"/*/Readest.ipa | tail -n +6 | xargs -r rm --
  echo "Saved to $out"
fi
