#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="/var/lib/lvsm/timelapse/logs"
LOG_FILE="$LOG_DIR/boot-events.log"

mkdir -p "$LOG_DIR"

echo "$(date -Is) BOOT $(hostname)" >> "$LOG_FILE"
