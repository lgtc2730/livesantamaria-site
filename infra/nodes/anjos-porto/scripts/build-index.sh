#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="/var/lib/lvsm/timelapse"
CAPTURES_DIR="$BASE_DIR/captures"
DAILY_DIR="$BASE_DIR/daily"
WEEKLY_DIR="$BASE_DIR/weekly"
LATEST_DIR="$BASE_DIR/latest"
THUMBS_DIR="$BASE_DIR/thumbs"
TODAY="$(date +%F)"

mkdir -p "$THUMBS_DIR/daily" "$THUMBS_DIR/weekly" "$THUMBS_DIR/today" "$LATEST_DIR"

select_best_day_frame() {
  local day="$1"
  local day_dir="$CAPTURES_DIR/$day"

  [[ -d "$day_dir" ]] || return 0

  local target_min="$SUNSET_MIN"

  find "$day_dir" -type f -name "*.jpg" | while read -r frame; do
    filename="$(basename "$frame")"

    time_part="${filename#*_}"
    hh="${time_part:0:2}"
    mm="${time_part:2:2}"

    [[ "$hh" =~ ^[0-9]{2}$ && "$mm" =~ ^[0-9]{2}$ ]] || continue

    frame_min=$((10#$hh * 60 + 10#$mm))
    diff=$(( frame_min - target_min ))
    (( diff < 0 )) && diff=$(( -diff ))

    printf "%05d %s\n" "$diff" "$frame"
  done | sort -n | head -n 1 | cut -d' ' -f2-
}

# Thumbnail principal do dia
# Em vez de usar o início do MP4, escolhe a imagem capturada mais próxima do pôr-do-sol.
eval "$("$BASE_DIR/scripts/solar-times.py")"

TODAY_DIR="$CAPTURES_DIR/$TODAY"
BEST_SUNSET_FRAME=""

if [[ -d "$TODAY_DIR" ]]; then
  BEST_SUNSET_FRAME="$(
    find "$TODAY_DIR" -type f -name "*.jpg" | while read -r frame; do
      filename="$(basename "$frame")"

      # Formato esperado: 20260604_153000.jpg
      time_part="${filename#*_}"
      hh="${time_part:0:2}"
      mm="${time_part:2:2}"

      [[ "$hh" =~ ^[0-9]{2}$ && "$mm" =~ ^[0-9]{2}$ ]] || continue

      frame_min=$((10#$hh * 60 + 10#$mm))
      diff=$(( frame_min - SUNSET_MIN ))
      (( diff < 0 )) && diff=$(( -diff ))

      printf "%05d %s\n" "$diff" "$frame"
    done | sort -n | sed -n '1p' | cut -d' ' -f2-
  )"

  if [[ -n "$BEST_SUNSET_FRAME" ]]; then
    cp "$BEST_SUNSET_FRAME" "$THUMBS_DIR/daily/latest-day.jpg"
  fi
fi

# Fallback: se ainda não houver frame perto do pôr-do-sol, usa o MP4.
if [[ ! -f "$THUMBS_DIR/daily/latest-day.jpg" && -f "$LATEST_DIR/latest-day.mp4" ]]; then
  ffmpeg -y -hide_banner -loglevel error \
    -ss 00:00:03 \
    -i "$LATEST_DIR/latest-day.mp4" \
    -frames:v 1 \
    -q:v 4 \
    "$THUMBS_DIR/daily/latest-day.jpg" || true
fi

# Thumbnails dos vídeos diários existentes
for video in "$DAILY_DIR"/*.mp4; do
  [[ -f "$video" ]] || continue

  name="$(basename "$video" .mp4)"
  day_dir="$CAPTURES_DIR/$name"
  best_day_frame=""

  if [[ -d "$day_dir" ]]; then
    best_day_frame="$(
      find "$day_dir" -type f -name "*.jpg" | while read -r frame; do
        filename="$(basename "$frame")"

        time_part="${filename#*_}"
        hh="${time_part:0:2}"
        mm="${time_part:2:2}"

        [[ "$hh" =~ ^[0-9]{2}$ && "$mm" =~ ^[0-9]{2}$ ]] || continue

        frame_min=$((10#$hh * 60 + 10#$mm))
        diff=$(( frame_min - SUNSET_MIN ))
        (( diff < 0 )) && diff=$(( -diff ))

        printf "%05d %s\n" "$diff" "$frame"
      done | sort -n | sed -n '1p' | cut -d' ' -f2-
    )"
  fi

  if [[ -n "$best_day_frame" ]]; then
    cp "$best_day_frame" "$THUMBS_DIR/daily/${name}.jpg"
  else
    ffmpeg -y -hide_banner -loglevel error \
      -ss 00:00:03 \
      -i "$video" \
      -frames:v 1 \
      -q:v 4 \
      "$THUMBS_DIR/daily/${name}.jpg" || true
  fi
done

# Snapshots representativos do dia
rm -f "$THUMBS_DIR/today/"*.jpg

TODAY_DIR="$CAPTURES_DIR/$TODAY"

if [[ -d "$TODAY_DIR" ]]; then
  for hour in 00 03 06 09 12 15 18 21; do
    frame="$(find "$TODAY_DIR" -type f -name "${TODAY//-/}_${hour}*.jpg" | sort | sed -n '1p' || true)"

    if [[ -n "$frame" ]]; then
      cp "$frame" "$THUMBS_DIR/today/${hour}.jpg"
    fi
  done
fi

# Última imagem capturada para thumbnail actual
if [[ -d "$TODAY_DIR" ]]; then
  latest_frame="$(find "$TODAY_DIR" -type f -name "*.jpg" | sort | tail -n 1 || true)"

  if [[ -n "$latest_frame" ]]; then
    cp "$latest_frame" "$THUMBS_DIR/current.jpg"
  fi
fi

# Thumbnail semanal
# Usa o thumbnail diário mais recente disponível, que já é escolhido com base no pôr-do-sol.
latest_daily_thumb="$(find "$THUMBS_DIR/daily" -maxdepth 1 -type f -name "20*.jpg" | sort | tail -n 1 || true)"

if [[ -n "$latest_daily_thumb" ]]; then
  cp "$latest_daily_thumb" "$THUMBS_DIR/weekly/latest-week.jpg"
elif [[ -f "$THUMBS_DIR/daily/latest-day.jpg" ]]; then
  cp "$THUMBS_DIR/daily/latest-day.jpg" "$THUMBS_DIR/weekly/latest-week.jpg"
elif [[ -f "$WEEKLY_DIR/latest-week.mp4" ]]; then
  ffmpeg -y -hide_banner -loglevel error \
    -ss 00:00:03 \
    -i "$WEEKLY_DIR/latest-week.mp4" \
    -frames:v 1 \
    -q:v 4 \
    "$THUMBS_DIR/weekly/latest-week.jpg" || true
fi

# Construção do index.json preparado para múltiplas câmaras
cat > "$BASE_DIR/index.json" <<JSON
{
  "updated": "$(date --iso-8601=seconds)",
  "cameras": [
    {
      "id": "anjos-porto",
      "name": "Anjos-Porto",
      "location": "Anjos",
      "enabled": true,
      "status": "Experimental",
      "currentThumb": "/thumbs/current.jpg",
      "latest": {
        "dayVideo": "/latest/latest-day.mp4",
        "dayThumb": "/thumbs/daily/latest-day.jpg"
      },
      "daily": [
JSON

first=true
for video in $(find "$DAILY_DIR" -maxdepth 1 -type f -name "*.mp4" | sort -r); do
  name="$(basename "$video" .mp4)"

  if [[ "$first" == true ]]; then
    first=false
  else
    echo "," >> "$BASE_DIR/index.json"
  fi

  cat >> "$BASE_DIR/index.json" <<JSON
        {
          "date": "$name",
          "video": "/daily/${name}.mp4",
          "thumb": "/thumbs/daily/${name}.jpg"
        }
JSON
done

cat >> "$BASE_DIR/index.json" <<JSON

      ],
      "today": [
JSON

first=true
for img in "$THUMBS_DIR/today/"*.jpg; do
  [[ -f "$img" ]] || continue
  hour="$(basename "$img" .jpg)"

  if [[ "$first" == true ]]; then
    first=false
  else
    echo "," >> "$BASE_DIR/index.json"
  fi

  cat >> "$BASE_DIR/index.json" <<JSON
        {
          "hour": "$hour:00",
          "thumb": "/thumbs/today/${hour}.jpg"
        }
JSON
done

cat >> "$BASE_DIR/index.json" <<JSON

      ],
      "weekly": {
        "video": "/weekly/latest-week.mp4",
        "thumb": "/thumbs/weekly/latest-week.jpg"
      }
    }
  ]
}
JSON

echo "Index gerado: $BASE_DIR/index.json"
