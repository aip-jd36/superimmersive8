#!/usr/bin/env bash
#
# SI8-INTEL-NEWS-4B1 -- regression coverage for push_digest_log.sh.
#
# push_digest_log.sh is a sequence of git commands, not Python -- true
# behavioral coverage means exercising real git repositories, not
# mocking. This harness builds a throwaway bare "origin" repo plus
# throwaway clones in a temp directory, runs the actual script against
# constructed race scenarios, and asserts on the real resulting git
# state. No GitHub API, no network, no CI dependency -- runs anywhere git
# is installed, in well under a second per case.
#
# Cases proven (see SI8-INTEL-NEWS-4B1 investigation):
#   A. no concurrent upstream change -> log update persists normally.
#   B. origin/main advances with an unrelated file change -> both the
#      upstream commit and the digest log update are preserved.
#   C. origin/main advances with a non-conflicting DIGEST-LOG.md change
#      -> both changes are preserved (git's 3-way merge can reconcile
#      edits to different regions of the same file).
#   D. origin/main advances with a CONFLICTING DIGEST-LOG.md change (the
#      same insertion point edited by both) -> the script fails visibly,
#      makes no push, and origin/main is left exactly as the concurrent
#      commit left it -- no force push, no history rewritten.
#
# Usage: bash tools/news-digest/tests/test_push_digest_log.sh

set -euo pipefail

SCRIPT_UNDER_TEST="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/push_digest_log.sh"
REL_LOG_PATH="02_Marketing/intelligence/DIGEST-LOG.md"

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

pass_count=0
fail_count=0

assert_true() {
  local description="$1"
  local condition="$2"
  if eval "$condition"; then
    echo "  PASS: $description"
    pass_count=$((pass_count + 1))
  else
    echo "  FAIL: $description"
    fail_count=$((fail_count + 1))
  fi
}

git_id() { git -C "$1" config user.name "Test Bot"; git -C "$1" config user.email "test@example.com"; }

# Build a fresh origin (bare) + seed clone, with an initial DIGEST-LOG.md
# whose structure matches digest.py's own real prepend format.
new_origin() {
  local id="$RANDOM-$RANDOM"
  local origin="$WORKDIR/origin-$id.git"
  local seed="$WORKDIR/seed-$id"
  git init --bare -q -b main "$origin"
  git init -q "$seed"
  git_id "$seed"
  mkdir -p "$seed/$(dirname "$REL_LOG_PATH")"
  cat > "$seed/$REL_LOG_PATH" <<'EOF'
# SI8 Intelligence -- Digest Development Log

Material developments surfaced by the News Intelligence pipeline.

---

## Week of September 21, 2026
*Run: 2026-09-21 · 3 high · 2 monitor · 1 deferred*

---
EOF
  git -C "$seed" add "$REL_LOG_PATH"
  git -C "$seed" commit -q -m "seed"
  git -C "$seed" branch -M main
  git -C "$seed" remote add origin "$origin"
  git -C "$seed" push -q origin main
  echo "$origin"
}

# Simulate the workflow's own checkout: a fresh clone of origin at its
# current tip (checkout happens BEFORE any concurrent race commit lands).
new_workflow_checkout() {
  local origin="$1"
  local checkout="$WORKDIR/checkout-$RANDOM"
  git clone -q "$origin" "$checkout"
  git_id "$checkout"
  echo "$checkout"
}

# Simulate a THIRD party pushing directly to origin while the workflow is
# "still running" (i.e. after the workflow's own checkout was taken).
push_concurrent_change() {
  local origin="$1"
  local relpath="$2"
  local content="$3"
  local message="$4"
  local other="$WORKDIR/concurrent-$RANDOM"
  git clone -q "$origin" "$other"
  git_id "$other"
  mkdir -p "$other/$(dirname "$relpath")"
  printf '%s' "$content" > "$other/$relpath"
  git -C "$other" add "$relpath"
  git -C "$other" commit -q -m "$message"
  git -C "$other" push -q origin main
}

echo "=== Case A: no concurrent upstream change ==="
origin="$(new_origin)"
checkout="$(new_workflow_checkout "$origin")"
printf '%s\n' "## Week of September 28, 2026" "*Run: 2026-09-28 · 5 high*" "" "---" > /tmp/newentry_a.txt
# Prepend our new entry right after the divider, mirroring digest.py's own prepend convention.
awk '1; /^---$/ && !done {print ""; while ((getline line < "/tmp/newentry_a.txt") > 0) print line; done=1}' "$checkout/$REL_LOG_PATH" > "$checkout/$REL_LOG_PATH.new"
mv "$checkout/$REL_LOG_PATH.new" "$checkout/$REL_LOG_PATH"
( cd "$checkout" && bash "$SCRIPT_UNDER_TEST" )
assert_true "origin/main now contains the new HIGH entry" \
  "git -C '$origin' show main:$REL_LOG_PATH | grep -q 'September 28, 2026'"
assert_true "origin/main still contains the original seed entry" \
  "git -C '$origin' show main:$REL_LOG_PATH | grep -q 'September 21, 2026'"
assert_true "exactly one new commit landed on origin/main" \
  "[ \"\$(git -C '$origin' log --oneline main | wc -l)\" -eq 2 ]"

echo ""
echo "=== Case B: origin/main advances with an UNRELATED file change ==="
origin="$(new_origin)"
checkout="$(new_workflow_checkout "$origin")"
# Take the checkout's local copy of DIGEST-LOG.md changes ready BEFORE the race lands.
awk '1; /^---$/ && !done {print ""; while ((getline line < "/tmp/newentry_a.txt") > 0) print line; done=1}' "$checkout/$REL_LOG_PATH" > "$checkout/$REL_LOG_PATH.new"
mv "$checkout/$REL_LOG_PATH.new" "$checkout/$REL_LOG_PATH"
# NOW simulate the race: an unrelated commit lands on origin while "the workflow is still running".
push_concurrent_change "$origin" "README-unrelated.md" "unrelated change" "unrelated: some other workflow's commit"
( cd "$checkout" && bash "$SCRIPT_UNDER_TEST" )
assert_true "the unrelated upstream commit is preserved" \
  "git -C '$origin' log --oneline main | grep -q 'unrelated: some other'"
assert_true "the digest log update is also preserved" \
  "git -C '$origin' show main:$REL_LOG_PATH | grep -q 'September 28, 2026'"
assert_true "history is linear (fast-forward-only, no merge commit)" \
  "[ \"\$(git -C '$origin' log --merges --oneline main | wc -l)\" -eq 0 ]"

echo ""
echo "=== Case C: origin/main advances with a NON-CONFLICTING DIGEST-LOG.md change ==="
origin="$(new_origin)"
checkout="$(new_workflow_checkout "$origin")"
awk '1; /^---$/ && !done {print ""; while ((getline line < "/tmp/newentry_a.txt") > 0) print line; done=1}' "$checkout/$REL_LOG_PATH" > "$checkout/$REL_LOG_PATH.new"
mv "$checkout/$REL_LOG_PATH.new" "$checkout/$REL_LOG_PATH"
# A concurrent commit edits a DIFFERENT region of the same file (its
# header line, far from our insertion point) -- git's 3-way merge can
# reconcile edits to different regions of one file.
other="$WORKDIR/concurrent-c"
git clone -q "$origin" "$other"; git_id "$other"
sed -i '1s/.*/# SI8 Intelligence -- Digest Development Log (v2 header)/' "$other/$REL_LOG_PATH"
git -C "$other" add "$REL_LOG_PATH"
git -C "$other" commit -q -m "docs: tweak digest log header wording"
git -C "$other" push -q origin main
( cd "$checkout" && bash "$SCRIPT_UNDER_TEST" )
assert_true "the concurrent header edit is preserved" \
  "git -C '$origin' show main:$REL_LOG_PATH | grep -q 'v2 header'"
assert_true "our own digest log entry is also preserved" \
  "git -C '$origin' show main:$REL_LOG_PATH | grep -q 'September 28, 2026'"

echo ""
echo "=== Case D: origin/main advances with a CONFLICTING DIGEST-LOG.md change (same insertion point) ==="
origin="$(new_origin)"
checkout="$(new_workflow_checkout "$origin")"
awk '1; /^---$/ && !done {print ""; while ((getline line < "/tmp/newentry_a.txt") > 0) print line; done=1}' "$checkout/$REL_LOG_PATH" > "$checkout/$REL_LOG_PATH.new"
mv "$checkout/$REL_LOG_PATH.new" "$checkout/$REL_LOG_PATH"
# A concurrent commit inserts a DIFFERENT entry at the exact same
# insertion point (the realistic same-day double-run scenario).
other="$WORKDIR/concurrent-d"
git clone -q "$origin" "$other"; git_id "$other"
printf '%s\n' "## Week of September 28, 2026" "*Run: 2026-09-28 · 9 high (a different run)*" "" "---" > /tmp/newentry_d.txt
awk '1; /^---$/ && !done {print ""; while ((getline line < "/tmp/newentry_d.txt") > 0) print line; done=1}' "$other/$REL_LOG_PATH" > "$other/$REL_LOG_PATH.new"
mv "$other/$REL_LOG_PATH.new" "$other/$REL_LOG_PATH"
git -C "$other" add "$REL_LOG_PATH"
git -C "$other" commit -q -m "digest: weekly article log 2026-09-28 (concurrent run)"
git -C "$other" push -q origin main
before_sha="$(git -C "$origin" rev-parse main)"
set +e
( cd "$checkout" && bash "$SCRIPT_UNDER_TEST" )
script_exit=$?
set -e
after_sha="$(git -C "$origin" rev-parse main)"
assert_true "script exited non-zero (visible failure)" "[ $script_exit -ne 0 ]"
assert_true "origin/main is unchanged (no push occurred)" "[ '$before_sha' = '$after_sha' ]"
assert_true "the concurrent run's entry is the one present on origin" \
  "git -C '$origin' show main:$REL_LOG_PATH | grep -q 'a different run'"
assert_true "no force-push flag or refspec appears in the script's executable code" \
  "! grep -v '^\s*#' '$SCRIPT_UNDER_TEST' | grep -E -- '--force|push[^\"]*-f |push[^\"]*\+main'"

echo ""
echo "============================================================"
echo "push_digest_log.sh regression results: $pass_count passed, $fail_count failed"
echo "============================================================"

if [ "$fail_count" -ne 0 ]; then
  exit 1
fi
