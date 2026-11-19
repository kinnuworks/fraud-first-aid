#!/usr/bin/env bash
# The README GIF: the one-click scam catch (scripts/watch-check.ts recording) and the complaint
# (scripts/demo-full.ts recording), sped up, with a caption on each part. Sample voices throughout.
# Run from the repo root: bash web/scripts/make-gif.sh <watch.webm> <full.webm> <out.gif>
set -euo pipefail
W="$1"; F="$2"; OUT="$3"
FONT="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
cap() { echo "drawbox=x=0:y=0:w=iw:h=64:color=0x20294c@0.92:t=fill,drawtext=fontfile='$FONT':text='$1':fontcolor=white:fontsize=30:x=(w-tw)/2:y=17"; }
ffmpeg -y -loglevel error -i "$W" -i "$F" -filter_complex "
[0:v]trim=start=0.5:end=27,setpts=(PTS-STARTPTS)/3,fps=12,scale=960:-2,$(cap '1. One click. It listens to a scam call and warns you')[a];
[1:v]trim=start=70:end=100,setpts=(PTS-STARTPTS)/3,fps=12,scale=960:-2,$(cap '2. Every digit read back. The screenshot catches the wrong group')[b];
[1:v]trim=start=234:end=242,setpts=(PTS-STARTPTS)/2,fps=12,scale=960:-2,$(cap '3. Ready for 1930 and your bank in minutes')[c];
[a][b][c]concat=n=3:v=1:a=0,split[x][y];[x]palettegen=max_colors=96:stats_mode=diff[p];[y][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" "$OUT"
ls -la "$OUT"
