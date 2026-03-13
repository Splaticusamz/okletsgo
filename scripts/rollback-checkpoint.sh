#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
checkpoint="checkpoint-pre-animation-pipeline-2026-03-13"
if ! git rev-parse "$checkpoint" >/dev/null 2>&1; then
  echo "Checkpoint tag not found: $checkpoint" >&2
  exit 1
fi
git reset --hard "$checkpoint"
echo "Rolled back to $checkpoint ($(git rev-parse --short HEAD))"
