#!/usr/bin/env python3
"""Third claim (EVAL_PLAN.md): make phone-line copies of the FLEURS clips, G.711 mu-law at 8 kHz
(the codec of Indian PSTN and Twilio calls), decoded back to 16-bit WAV for upload.
Writes evidence/.cache/fleurs/<lang>/<split>-phone/ with the same items.tsv.

  python3 -I evidence/fleurs/phone.py test
"""
import os, shutil, subprocess, sys

ROOT = os.path.join(os.path.dirname(__file__), "..", ".cache", "fleurs")
LANGS = ["hi_in", "te_in", "kn_in"]

def main(split):
    for lang in LANGS:
        src = os.path.join(ROOT, lang, split)
        out = src + "-phone"
        os.makedirs(out, exist_ok=True)
        shutil.copy(os.path.join(src, "items.tsv"), out)
        n = 0
        for name in sorted(os.listdir(src)):
            if not name.endswith(".wav"):
                continue
            mulaw = os.path.join(out, name + ".mulaw.wav")
            dst = os.path.join(out, name)
            if os.path.exists(dst):
                n += 1
                continue
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(src, name), "-ar", "8000", "-ac", "1", "-c:a", "pcm_mulaw", mulaw], check=True)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mulaw, "-ar", "8000", "-ac", "1", "-c:a", "pcm_s16le", dst], check=True)
            os.remove(mulaw)
            n += 1
        print(f"{lang} {split}: {n} phone-band clips")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "test")
