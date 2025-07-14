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
# TODO: see if sharp can do frame splitting.
ffmpeg \
    -i "${VIDEO_FILE}" \
    "${OUT_DIR}/frame_%04d.png" &>/dev/null

# resize each frame and remove the background
# TODO: possibly use sharp node package for this instead so that
#       all the logic can be in a single file. Sharp also happens
#       to be around 4-5x faster.
# magick mogrify -resize 80x60\! -fuzz 40% -transparent white "${OUT_DIR}/*.png"
magick mogrify -resize 80x60\! "${OUT_DIR}/*.png"

node ../dist/main.js "${OUT_DIR}"
trash "${OUT_DIR}"
