#!/usr/bin/env bash
# One-shot quality gate for the whole library: style lint plus continuity
# audit across every scenario. Exit code is non-zero if either reports
# errors. Run before every merge to main.
#
#   bash tools/check_all.sh          # full library
#   bash tools/check_all.sh --quiet  # summary lines only
set -uo pipefail
cd "$(dirname "$0")/.."
quiet=0; [ "${1:-}" = "--quiet" ] && quiet=1
rc=0
echo "== style_lint =="
if [ $quiet -eq 1 ]; then
  python3 tools/style_lint.py --all 2>&1 | grep -E "^==|\([0-9]+ errors" || true
else
  python3 tools/style_lint.py --all || rc=1
fi
echo; echo "== audit_continuity =="
if [ $quiet -eq 1 ]; then
  python3 tools/audit_continuity.py --all 2>&1 | grep -E "^scenarios/|PROBLEMS|No problems" || true
else
  python3 tools/audit_continuity.py --all || rc=1
fi
if [ $quiet -eq 1 ]; then
  python3 tools/style_lint.py --all >/dev/null 2>&1 || rc=1
  python3 tools/audit_continuity.py --all >/dev/null 2>&1 || rc=1
fi
echo; [ $rc -eq 0 ] && echo "check_all: PASS" || echo "check_all: FAIL"
exit $rc
