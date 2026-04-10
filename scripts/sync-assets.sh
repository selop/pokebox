#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="${1:?Usage: sync-assets.sh <user@host> [local-source]}"
SOURCE="${2:-./public}"

echo "Syncing assets from ${SOURCE}/ to ${REMOTE_HOST}:/mnt/HC_Volume_102273859/pokebox-assets/ ..."
rsync -avz --delete \
  --include='*/' \
  --include='*.webp' \
  --include='*.json' \
  --exclude='*' \
  "${SOURCE}/" "${REMOTE_HOST}:/mnt/HC_Volume_102273859/pokebox-assets/"
echo "Done."
