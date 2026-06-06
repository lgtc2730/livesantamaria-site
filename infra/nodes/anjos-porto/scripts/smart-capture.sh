#!/usr/bin/env bash
set -euo pipefail

CAPTURE_SCRIPT="/var/lib/lvsm/timelapse/scripts/capture-frame.sh"
SOLAR_SCRIPT="/var/lib/lvsm/timelapse/scripts/solar-times.py"

# Carrega SUNRISE_MIN, SUNSET_MIN, SUNRISE_TEXT, SUNSET_TEXT
eval "$("$SOLAR_SCRIPT")"

HH="$(date +%H)"
MM="$(date +%M)"
NOW_MIN=$((10#$HH * 60 + 10#$MM))

WINDOW=45

SUNRISE_START=$((SUNRISE_MIN - WINDOW))
SUNRISE_END=$((SUNRISE_MIN + WINDOW))

SUNSET_START=$((SUNSET_MIN - WINDOW))
SUNSET_END=$((SUNSET_MIN + WINDOW))

should_capture=false
mode="night"

if (( NOW_MIN >= SUNRISE_START && NOW_MIN <= SUNRISE_END )); then
  should_capture=true
  mode="sunrise"

elif (( NOW_MIN >= SUNSET_START && NOW_MIN <= SUNSET_END )); then
  should_capture=true
  mode="sunset"

elif (( NOW_MIN > SUNRISE_END && NOW_MIN < SUNSET_START )); then
  mode="day"
  if (( 10#$MM % 3 == 0 )); then
    should_capture=true
  fi

else
  mode="night"
  if (( 10#$MM % 30 == 0 )); then
    should_capture=true
  fi
fi

if [[ "$should_capture" == true ]]; then
  echo "Capturing frame - mode=${mode} time=$(date --iso-8601=seconds) sunrise=${SUNRISE_TEXT} sunset=${SUNSET_TEXT}"
  "$CAPTURE_SCRIPT"
else
  echo "Skipping frame - mode=${mode} time=$(date --iso-8601=seconds) sunrise=${SUNRISE_TEXT} sunset=${SUNSET_TEXT}"
fi
