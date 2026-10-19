#!/bin/sh
# The testing protocol (test-core, pinned in test-core/: MANIFEST.json), run after `node tests/e2e.cjs`, which writes the
# JUnit report and every control the games showed to .test-output/e2e/ (or $GAMING_CORE_E2E_OUT).
#   1. every starter has a SCENARIOS.md, and each scenario has an e2e test of the same title that ran and passed
#   2. every control has an e2e step; a step that uses a control which no longer exists fails
#   3. no fixed waits, no .only, no networkidle, no real hosts in the e2e tests
set -e
cd "$(dirname "$0")/.."
T=test-core/tools
OUT=${GAMING_CORE_E2E_OUT:-.test-output/e2e}
J=$OUT/junit.xml
echo "== scenarios"
missing=0
for dir in starters/emptyGame starters/pong starters/kit starters/genres/*/; do
  dir=${dir%/}; [ -f "$dir/SCENARIOS.md" ] || { echo "NO  $dir/SCENARIOS.md is missing"; missing=1; }
done
[ $missing = 0 ]
python3 $T/scenarios.py check starters/kit/SCENARIOS.md --tests tests/e2e/kit.cjs --junit "$J"
for id in emptyGame pong; do
  python3 $T/scenarios.py check starters/$id/SCENARIOS.md --tests tests/e2e/$id.cjs --junit "$J"
done
for dir in starters/genres/*/; do
  id=$(basename "$dir")
  python3 $T/scenarios.py check "$dir/SCENARIOS.md" --tests "tests/e2e/genres/$id.cjs" --junit "$J"
done
echo "== controls"
python3 $T/e2e_coverage.py --pages "$OUT/controls/*.html" --tests "tests/e2e/**/*.cjs"
echo "== flaky patterns"
python3 $T/flaky_lint.py tests/e2e.cjs tests/e2e/*.cjs tests/e2e/genres/*.cjs
