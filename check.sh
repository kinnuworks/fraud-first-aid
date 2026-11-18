#!/usr/bin/env bash
# The checks that prove this project works: tests, typecheck, and the end-to-end script
# that walks the demo path in a real browser against the real API, recording a screen
# video of it. Exits non-zero when anything fails.
#
# Keep it fast enough to run often (a few minutes at most), stop any server it starts
# before it exits, and never make a check pass by skipping, weakening or special-casing it.
set -euo pipefail
cd "$(dirname "$0")"

(cd web && pnpm -s typecheck && pnpm -s lint && pnpm -s test)
# Real external API the agent calls: IFSC -> bank branch (public, no key).
curl -sf -m 15 https://ifsc.razorpay.com/SBIN0000813 | grep -q '"BANK":"State Bank of India"' \
  || { echo "check.sh: live IFSC API check failed"; exit 1; }

# For example:
# npm run typecheck
# npm test
# npx playwright test e2e/demo-path.spec.ts   (with video: 'on')

# Evidence labels: once evidence/EVAL_PLAN.md exists, the public text (README, submission text,
# video script) must label every evidence claim for its kind.
if [ -f evidence/EVAL_PLAN.md ] && [ -f evidence_lint.py ]; then
  python3 -I evidence_lint.py
fi

echo "check.sh: web typecheck, unit tests and live IFSC API check passed"
