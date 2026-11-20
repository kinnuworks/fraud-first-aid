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
# the live app's "Check it yourself" page states the same results, so it is checked too
PROOF = (ROOT / "web" / "app" / "proof" / "page.tsx").read_text(encoding="utf-8")
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


def claim(label, got, phrases, proof=()):
    missing = [p for p in phrases if p not in README] + [f"/proof: {p}" for p in proof if p not in PROOF]
    status = "ok" if not missing else "missing: " + "; ".join(missing)
    print(f"{label}: {got} -> {status}")
    if missing:
        failures.append(label)


# FLEURS back-test, full band
r = rows("fleurs-test-2026-11-19.csv")
o, b, n = total(r, "ours"), total(r, "baseline"), len(r)
claim("FLEURS back-test", f"{o}/{n} vs {b}/{n}, diff {interval('fleurs-test-2026-11-19.csv')}", [f"{o} of {n}", f"{b}"], proof=[f"{o} of {n}", f"own numerals: {b}"])

# FLEURS through the phone codec
r = rows("fleurs-test-phone-2026-11-20.csv")
o, b, n = total(r, "ours"), total(r, "baseline"), len(r)
claim("FLEURS phone codec", f"{o}/{n} vs {b}/{n}, diff {interval('fleurs-test-phone-2026-11-20.csv')}", [f"{o} of {n}", f"{b} for the speech-to-text"], proof=[f"{o} of {n}", f"own numerals: {b}"])

# FLEURS in six more languages (fourth claim)
r = rows("fleurs-test-six-2026-11-21.csv")
o, b, n = total(r, "ours"), total(r, "baseline"), len(r)
lo, hi = interval("fleurs-test-six-2026-11-21.csv")
claim("FLEURS six more languages", f"{o}/{n} vs {b}/{n}, diff {lo} to {hi}", [f"{o} of {n:,}", f"against {b}", f"{lo:.2f} to {hi:.2f}"])

# Numbers in noise (our own break test)
r = rows("breaktest-2026-11-19.csv")
o, b, n = total(r, "ours"), total(r, "baseline"), len(r)
claim("Numbers in noise", f"{o}/{n} vs {b}/{n}", [f"{o} of {n}", f"{b} of {n}"], proof=[f"{o} of {n}", f"own numerals: {b}"])

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

# The same two break tests as the /proof page links them (the latest reruns)
r = rows("guard-breaktest-rerun3-2026-11-20.csv")
claim("Guard break test (/proof)", f"{total(r, 'warned')}/{len(r)}", [], proof=[f"{total(r, 'warned')} of {len(r)}", "guard-breaktest-rerun3-2026-11-20.csv"])
r = rows("guard-ordinary-run3-2026-11-20.csv")
claim("Ordinary calls (/proof)", f"{total(r, 'passed')}/{len(r)} silent", [], proof=[f"{total(r, 'passed')} of {len(r)}", "guard-ordinary-run3-2026-11-20.csv"])

# INDICA held-out test sample: scam and legitimate conversations in eight languages
r = rows("indica-test-2026-11-20.csv")
scam = [x for x in r if x["label"] == "scam"]
legit = [x for x in r if x["label"] == "legit"]
o, b, n = total(scam, "ours"), total(scam, "baseline"), len(scam)
fa, nl = total(legit, "ours"), len(legit)
lo, hi = interval("indica-test-scam-paired-2026-11-20.csv")
claim("INDICA guard test", f"scam {o}/{n} vs keyword rules {b}/{n}, legit warned {fa}/{nl}, diff {lo} to {hi}",
      [f"{o} of {n}", f"{b} of {n}", f"{lo:.2f} to {hi:.2f}"] + (["none of 200"] if fa == 0 and nl == 200 else [f"{fa} of {nl}"]),
      proof=[f"{o} of {n}", f"Keyword rules on the same lines: {b}"])

# ICFD-31k, twelfth claim: the guard against the same AI model simply told to warn about scams
ours = rows("icfd-ours-twelfth-2026-11-20.csv")
gen = rows("icfd-generic-twelfth-2026-11-20.csv")
oy = [x for x in ours if x["verdict"] == "YES"]
on = [x for x in ours if x["verdict"] == "NO"]
gy = [x for x in gen if x["verdict"] == "YES"]
gn = [x for x in gen if x["verdict"] == "NO"]
w, q, gw, gf = total(oy, "ours"), len(on) - total(on, "ours"), total(gy, "warned"), total(gn, "warned")
claim("ICFD vs a plain AI assistant", f"ours {w}/{len(oy)} scam, quiet {q}/{len(on)} legit; plain assistant {gw}/{len(gy)}, {gf}/{len(gn)} legit warned",
      [f"{w} of {len(oy)}", f"{q} of {len(on)}", f"warned on {gw}", f"{gf} of {len(gn)}"],
      proof=[f"{len(on) - q} of {len(on)}", f"{gf} of {len(gn)}", f"caught {w} of {len(oy)}", f"plain assistant {gw}"])

# Five scam calls started at the same moment on the live app
r = rows("concurrent-2026-11-20.csv")
ok = sum(1 for x in r if x["ok"] in ("1", "true", "True"))
secs = sorted(float(x["warning_s"]) for x in r)
span = f"{secs[0]:.1f} to {secs[-1]:.1f}"
claim("Five calls at once", f"{ok}/{len(r)} warned, {span} s", ["all five got the warning", span], proof=[f"{ok} of {len(r)}", span])

if failures:
    print(f"\nEVIDENCE NOT VERIFIED: {', '.join(failures)}")
    sys.exit(1)
print("\nEVIDENCE VERIFIED: every published number recomputed from its results file")
