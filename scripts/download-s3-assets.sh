#!/usr/bin/env bash
set -euo pipefail

DEST="${1:-./pokebox-assets}"
echo "Downloading assets from S3 to ${DEST}/ ..."
rclone sync hetzner:pokebox-assets/ "${DEST}/" \
  --include "*.webp" \
  --include "*.json" \
  --progress
echo "Done. $(du -sh "${DEST}" | cut -f1) downloaded."
