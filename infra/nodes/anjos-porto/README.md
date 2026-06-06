# LVSM Node — Anjos-Porto

Nó piloto do projecto Live Santa Maria para câmara e timelapse.

## Identificação

- Node ID: anjos-porto
- Hostname: anjos-porto-cam
- Local: Anjos
- Função: Câmara + Timelapse

## Domínios

- Câmara/HLS: https://anjos-cam.livesantamaria.org
- Timelapse/dados: https://anjos-timelapse.livesantamaria.org

## Portas locais

- MediaMTX: http://127.0.0.1:8888
- Timelapse HTTP: http://127.0.0.1:8080

## Pastas principais

- /var/lib/lvsm/timelapse
- /var/lib/lvsm/timelapse/scripts
- /var/lib/lvsm/timelapse/captures
- /var/lib/lvsm/timelapse/daily
- /var/lib/lvsm/timelapse/weekly
- /var/lib/lvsm/timelapse/latest
- /var/lib/lvsm/timelapse/thumbs
- /var/lib/lvsm/timelapse/logs

## Serviços

- cloudflared.service
- mediamtx.service
- lvsm-timelapse-http.service
- lvsm-boot-log.service

## Timers

- lvsm-timelapse-capture.timer
- lvsm-timelapse-index.timer

## Scripts

- build-index.sh
- build-weekly.sh
- capture-frame.sh
- smart-capture.sh
- solar-times.py
- timelapse-http.py
- lvsm-boot-log.sh

## Retenção prevista

- captures/: manter 3 dias
- daily/: manter últimos 30 dias
- weekly/: manter últimos 6 vídeos
- latest/: substituível
- thumbs/: reconstruível

## Notas

Este nó é o modelo inicial para futura replicação de outros nós LVSM.
