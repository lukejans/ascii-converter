#!/usr/bin/env bash

# fail fast
set -euo pipefail

declare -r VIDEO_FILE="$1"
declare OUT_DIR
OUT_DIR="$(pwd)/frames"

# make sure that the video file exists
if [ ! -f "${VIDEO_FILE}" ]; then
    echo "Video file not found." >&2
    exit 1
fi

# create a unique output directory
if [ -d "${OUT_DIR}" ]; then
    mv "${OUT_DIR}" "${OUT_DIR}_backup_$(date +%s)"
fi
mkdir "${OUT_DIR}"

# create a png file for each frame in the video
# TODO: use node child_process.exec to run this command so
#       we can avoid using a shell script entirely. It will
#       also allow for better error handling and readability
#       in comparison to bash scripts.
ffmpeg -i "${VIDEO_FILE}" "${OUT_DIR}/frame_%04d.png" &>/dev/null

node ../dist/main.js "${OUT_DIR}"
trash "${OUT_DIR}"
