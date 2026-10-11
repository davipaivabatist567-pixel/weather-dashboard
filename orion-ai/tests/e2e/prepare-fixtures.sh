#!/usr/bin/env bash
# Baixa imagens de exemplo do MediaPipe e gera vídeos .y4m usados como câmera falsa do Chromium.
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)/fixtures"
mkdir -p "$dir"
fetch() { [ -f "$dir/$2" ] || curl -fsSL "$1" -o "$dir/$2"; }
fetch https://storage.googleapis.com/mediapipe-tasks/hand_landmarker/woman_hands.jpg pessoa_maos.jpg
fetch https://storage.googleapis.com/mediapipe-assets/thumb_up.jpg polegar.jpg
# 640x480 (proporção 4:3 com bordas), 15 quadros a 15 fps
ffmpeg -loglevel error -y -loop 1 -i "$dir/pessoa_maos.jpg" -vf "scale=-2:480,pad=640:480:(ow-iw)/2:0:black,format=yuv420p" -frames:v 15 -r 15 "$dir/pessoa_maos.y4m"
ffmpeg -loglevel error -y -loop 1 -i "$dir/polegar.jpg" -vf "scale=-2:480,pad=640:480:(ow-iw)/2:0:white,format=yuv420p" -frames:v 15 -r 15 "$dir/polegar.y4m"
echo "fixtures prontas em $dir"
