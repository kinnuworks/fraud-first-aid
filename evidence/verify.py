#!/usr/bin/env python3
"""Recompute every published evidence number from the committed results files and check that
the README states each one. CI runs this on every push (the "evidence verified" badge), so a
number in the README can't drift from its data.

Run: python3 -I evidence/verify.py
"""
import csv
from decimal import Decimal, ROUND_HALF_UP
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / "evidence" / "results"
README = (ROOT / "README.md").read_text(encoding="utf-8")
failures = []


def rows(name):
    with open(RES / name, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def total(rs, col):
    return sum(int(r[col]) for r in rs)


def interval(name, filt=None):
    """The paired-difference bootstrap interval, from evidence/interval.py, as 'a to b' (2 dp)."""
    path = RES / name
    if filt:
        tmp = ROOT / "evidence" / ".cache" / ("verify-" + name)
        tmp.parent.mkdir(parents=True, exist_ok=True)
        keep = [r for r in rows(name) if filt(r)]
        with open(tmp, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["ours", "baseline"])
            w.writeheader()
            for r in keep:
                w.writerow({"ours": r["ours"], "baseline": r["baseline"]})
        path = tmp
    out = subprocess.run([sys.executable, "-I", str(ROOT / "evidence" / "interval.py"), "diff", str(path), "ours", "baseline"],
                         capture_output=True, text=True, check=True).stdout
    lo, hi = out.split("interval ")[1].split(";")[0].split(" to ")
    two = lambda x: float(Decimal(x.strip()).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    return two(lo), two(hi)


def claim(label, got, phrases):
    missing = [p for p in phrases if p not in README]
    status = "ok" if not missing else "README is missing: " + "; ".join(missing)
    print(f"{label}: {got} -> {status}")
    if missing:
        failures.append(label)


# FLEURS back-test, full band
r = rows("fleurs-test-2026-11-19.csv")
o, b, n = total(r, "ours"), total(r, "baseline"), len(r)
claim("FLEURS back-test", f"{o}/{n} vs {b}/{n}, diff {interval('fleurs-test-2026-11-19.csv')}", [f"{o} of {n}", f"{b}"])

# FLEURS through the phone codec
r = rows("fleurs-test-phone-2026-11-20.csv")
o, b, n = total(r, "ours"), total(r, "baseline"), len(r)
claim("FLEURS phone codec", f"{o}/{n} vs {b}/{n}, diff {interval('fleurs-test-phone-2026-11-20.csv')}", [f"{o} of {n}", f"{b} for the speech-to-text"])

# Numbers in noise (our own break test)
r = rows("breaktest-2026-11-19.csv")
o, b, n = total(r, "ours"), total(r, "baseline"), len(r)
claim("Numbers in noise", f"{o}/{n} vs {b}/{n}", [f"{o} of {n}", f"{b} of {n}"])

# ICFD-31k guard back-test: the 200 fraud conversations
r = [x for x in rows("icfd-cross-domain-2026-11-20.csv") if x["verdict"] == "YES"]
o, b, n = total(r, "ours"), total(r, "baseline"), len(r)
lo, hi = interval("icfd-cross-domain-2026-11-20.csv", lambda x: x["verdict"] == "YES")
claim("ICFD guard back-test", f"{o}/{n} vs {b}/{n}, diff {lo} to {hi}", [f"{o} of {n}", f"{b} of {n}", f"{lo:.2f} to {hi:.2f}"])

# Guard break test on the current build
r = rows("guard-breaktest-rerun2-2026-11-20.csv")
a = [x for x in r if x["group"] == "A"]
bb = [x for x in r if x["group"] == "B"]
claim("Guard break test", f"A {total(a, 'warned')}/{len(a)}, B {total(bb, 'warned')}/{len(bb)}", [f"{total(a, 'warned')} of {len(a)}"])

# Ordinary calls
r = rows("guard-ordinary-run2-2026-11-20.csv")
claim("Ordinary calls", f"{total(r, 'passed')}/{len(r)} silent", [f"{total(r, 'passed')} of {len(r)}"])

if failures:
    print(f"\nEVIDENCE NOT VERIFIED: {', '.join(failures)}")
    sys.exit(1)
print("\nEVIDENCE VERIFIED: every published number recomputed from its results file")
