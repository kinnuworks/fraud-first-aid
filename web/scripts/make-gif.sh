#!/usr/bin/env bash
# The README GIF: the one-click scam catch (scripts/watch-check.ts recording), then the complaint
# and the 1930 interpreter (scripts/interpret-check.ts recording), sped up, each with a caption bar
# (scripts/gif-captions.ts). Sample voices throughout (labelled in the README).
# Run from the repo root: bash web/scripts/make-gif.sh <watch.webm> <full.webm> <utrStart> <thirdStart> <captions-dir> <out.gif> [thirdLength, default 8]
# (utrStart and thirdStart are seconds into the full recording; the third part is the pack or the interpreter)
set -euo pipefail
W="$1"; F="$2"; UTR="$3"; PACK="$4"; C="$5"; OUT="$6"; LEN="${7:-8}"
ffmpeg -y -loglevel error -i "$W" -i "$F" -i "$C/cap1.png" -i "$C/cap2.png" -i "$C/cap3.png" -filter_complex "
[0:v]trim=start=0.5:end=27,setpts=(PTS-STARTPTS)/3,fps=10,scale=880:-2[a0];[a0][2:v]overlay=0:0[a];
[1:v]trim=start=${UTR}:end=$((UTR+30)),setpts=(PTS-STARTPTS)/3,fps=10,scale=880:-2[b0];[b0][3:v]overlay=0:0[b];
[1:v]trim=start=${PACK}:end=$((PACK+LEN)),setpts=(PTS-STARTPTS)/2,fps=10,scale=880:-2[c0];[c0][4:v]overlay=0:0[c];
[a][b][c]concat=n=3:v=1:a=0,split[x][y];[x]palettegen=max_colors=80:stats_mode=diff[p];[y][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" "$OUT"
ls -la "$OUT"
