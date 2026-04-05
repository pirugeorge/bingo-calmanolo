#!/bin/bash
# Convierte todos los .ogg a .mp3 en las carpetas de audio
# Uso: ./convertir_audios.sh
#
# Primero instala ffmpeg si no lo tienes:
#   sudo apt-get install ffmpeg

if ! command -v ffmpeg &> /dev/null; then
    echo "ffmpeg no está instalado. Ejecuta: sudo apt-get install ffmpeg"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

find "$SCRIPT_DIR/audio" -name "*.ogg" | while read ogg; do
    mp3="${ogg%.ogg}.mp3"
    if [ ! -f "$mp3" ]; then
        echo "Convirtiendo: $ogg -> $mp3"
        ffmpeg -i "$ogg" -q:a 2 "$mp3" -y -loglevel error
    else
        echo "Ya existe: $mp3"
    fi
done

echo "Conversión completada."
