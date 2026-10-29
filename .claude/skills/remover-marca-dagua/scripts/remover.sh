#!/usr/bin/env bash
# Remove uma marca d'água de um vídeo com ffmpeg.
# Uso:
#   remover.sh entrada.mp4 saida.mp4 X Y LARGURA ALTURA [modo]
#   modo: delogo (padrão, borra a área com os pixels vizinhos)
#         blur   (desfoque forte só na área)
#         crop   (corta a faixa da borda onde está a marca)
# Para várias marcas, rode de novo sobre a saída.
set -euo pipefail

if [ $# -lt 6 ]; then
  sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi

in=$1 out=$2 x=$3 y=$4 w=$5 h=$6 mode=${7:-delogo}

read -r vw vh < <(ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height -of csv=p=0:s=x "$in" | tr x ' ')

# delogo exige que a caixa fique pelo menos 1px dentro do quadro
if (( x < 1 )); then x=1; fi
if (( y < 1 )); then y=1; fi
if (( x + w > vw - 1 )); then w=$(( vw - 1 - x )); fi
if (( y + h > vh - 1 )); then h=$(( vh - 1 - y )); fi

case $mode in
  delogo)
    vf="delogo=x=$x:y=$y:w=$w:h=$h" ;;
  blur)
    vf="[0:v]crop=$w:$h:$x:$y,boxblur=20:5[b];[0:v][b]overlay=$x:$y" ;;
  crop)
    # Corta a faixa da borda mais próxima da marca
    top=$y bottom=$(( vh - y - h )) left=$x right=$(( vw - x - w ))
    min=$(printf '%s\n' $top $bottom $left $right | sort -n | head -1)
    if   (( min == bottom )); then vf="crop=$vw:$y:0:0"
    elif (( min == top ));    then vf="crop=$vw:$bottom:0:$(( y + h ))"
    elif (( min == right ));  then vf="crop=$x:$vh:0:0"
    else                           vf="crop=$right:$vh:$(( x + w )):0"
    fi
    vf="$vf,scale=trunc(iw/2)*2:trunc(ih/2)*2" ;;
  *) echo "modo inválido: $mode" >&2; exit 1 ;;
esac

if [ "$mode" = blur ]; then
  ffmpeg -hide_banner -y -i "$in" -filter_complex "$vf" -c:v libx264 -crf 18 -preset medium -c:a copy "$out"
else
  ffmpeg -hide_banner -y -i "$in" -vf "$vf" -c:v libx264 -crf 18 -preset medium -c:a copy "$out"
fi
echo "Pronto: $out"
