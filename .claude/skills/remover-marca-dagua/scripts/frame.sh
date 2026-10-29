#!/usr/bin/env bash
# Extrai um quadro do vídeo com grade de coordenadas, para achar a posição da marca.
# Uso: frame.sh entrada.mp4 saida.png [segundo]
set -euo pipefail
in=$1 out=$2 t=${3:-1}
ffmpeg -hide_banner -loglevel error -y -ss "$t" -i "$in" -frames:v 1 \
  -vf "drawgrid=w=100:h=100:t=1:c=red@0.6" "$out"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of default=nw=1 "$in"
echo "Quadro salvo em $out (grade vermelha a cada 100px)"
