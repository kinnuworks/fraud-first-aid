#!/usr/bin/env bash
# The README GIF: the one-click scam catch (scripts/watch-check.ts recording) and the complaint
# (scripts/demo-full.ts recording), sped up, each with a caption bar (scripts/gif-captions.ts).
# Sample voices throughout (labelled in the README).
# Run from the repo root: bash web/scripts/make-gif.sh <watch.webm> <full.webm> <full-run-start-offsets: utrStart packStart> <captions-dir> <out.gif>
set -euo pipefail
W="$1"; F="$2"; UTR="$3"; PACK="$4"; C="$5"; OUT="$6"
ffmpeg -y -loglevel error -i "$W" -i "$F" -i "$C/cap1.png" -i "$C/cap2.png" -i "$C/cap3.png" -filter_complex "
[0:v]trim=start=0.5:end=27,setpts=(PTS-STARTPTS)/3,fps=10,scale=880:-2[a0];[a0][2:v]overlay=0:0[a];
[1:v]trim=start=${UTR}:end=$((UTR+30)),setpts=(PTS-STARTPTS)/3,fps=10,scale=880:-2[b0];[b0][3:v]overlay=0:0[b];
[1:v]trim=start=${PACK}:end=$((PACK+8)),setpts=(PTS-STARTPTS)/2,fps=10,scale=880:-2[c0];[c0][4:v]overlay=0:0[c];
[a][b][c]concat=n=3:v=1:a=0,split[x][y];[x]palettegen=max_colors=80:stats_mode=diff[p];[y][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" "$OUT"
ls -la "$OUT"
