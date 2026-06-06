#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# LVSM Timelapse - Capture Frame
# Captura 1 frame directamente da fonte RTSP da câmara.
# ============================================================

BASE_DIR="/var/lib/lvsm/timelapse"
CAPTURE_DIR="$BASE_DIR/captures/$(date +%F)"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

# TODO: substituir pelo RTSP real da câmara Anjos-Porto
RTSP_URL="rtsp://192.168.1.244:554/11"

mkdir -p "$CAPTURE_DIR"

ffmpeg \
  -hide_banner \
  -loglevel error \
  -rtsp_transport tcp \
  -i "$RTSP_URL" \
  -frames:v 1 \
  -q:v 3 \
  "$CAPTURE_DIR/${TIMESTAMP}.jpg"
