#!/usr/bin/env python3
"""Download one FLEURS split (pinned revision) for hi_in, te_in, kn_in and keep only the
utterances whose raw transcription contains a numeral. Writes evidence/.cache/fleurs/<lang>/<split>/.

  python3 -I evidence/fleurs/fetch.py dev      # building slice
  python3 -I evidence/fleurs/fetch.py test     # test slice: run once, after the build freezes
"""
import csv, io, os, re, sys, tarfile, urllib.request

REV = "70bb2e84b976b7e960aa89f1c648e09c59f894dd"
LANGS = ["hi_in", "te_in", "kn_in"]
NUMERAL = re.compile(r"[0-9०-९౦-౯೦-೯]")
ROOT = os.path.join(os.path.dirname(__file__), "..", ".cache", "fleurs")

def get(url):
    with urllib.request.urlopen(url, timeout=600) as r:
        return r.read()

def main(split):
    assert split in ("dev", "test"), "split is dev or test"
    for lang in LANGS:
        out = os.path.join(ROOT, lang, split)
        os.makedirs(out, exist_ok=True)
        base = f"https://huggingface.co/datasets/google/fleurs/resolve/{REV}/data/{lang}"
        rows = [r for r in csv.reader(io.StringIO(get(f"{base}/{split}.tsv").decode()), delimiter="\t")]
        keep = {r[1]: r for r in rows if NUMERAL.search(r[2])}
        with open(os.path.join(out, "items.tsv"), "w", newline="") as f:
            w = csv.writer(f, delimiter="\t")
            for name, r in sorted(keep.items()):
                w.writerow([r[0], name, r[2]])
        tar_path = os.path.join(out, "audio.tar.gz")
        if not os.path.exists(tar_path):
            urllib.request.urlretrieve(f"{base}/audio/{split}.tar.gz", tar_path)
        with tarfile.open(tar_path) as t:
            for m in t.getmembers():
                name = os.path.basename(m.name)
                if m.isfile() and name in keep:
                    m.name = name
                    t.extract(m, out, filter="data")
        os.remove(tar_path)
        print(f"{lang} {split}: {len(keep)} utterances with numerals")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "dev")
