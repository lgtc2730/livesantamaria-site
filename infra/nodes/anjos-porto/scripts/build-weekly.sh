#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="/var/lib/lvsm/timelapse"

DAILY_DIR="$BASE_DIR/daily"
WEEKLY_DIR="$BASE_DIR/weekly"

mkdir -p "$WEEKLY_DIR"

TMP_LIST="$(mktemp)"

find "$DAILY_DIR" \
  -maxdepth 1 \
  -type f \
  -name "*.mp4" \
  | sort \
  | tail -7 \
  > "$TMP_LIST.files"

> "$TMP_LIST"

while read -r file; do
  echo "file '$file'" >> "$TMP_LIST"
done < "$TMP_LIST.files"

if [[ ! -s "$TMP_LIST" ]]; then
  echo "Sem vídeos diários."
  exit 0
fi

ffmpeg \
  -y \
  -hide_banner \
  -loglevel error \
  -f concat \
  -safe 0 \
  -i "$TMP_LIST" \
  -c copy \
  "$WEEKLY_DIR/latest-week.mp4"

rm -f "$TMP_LIST" "$TMP_LIST.files"

echo "Weekly criado."
