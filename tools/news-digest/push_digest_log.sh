#!/usr/bin/env bash
#
# SI8-INTEL-NEWS-4B1 -- race-safe DIGEST-LOG.md / DIGEST-AUDIT.md persistence.
#
# Commits any pending change to 02_Marketing/intelligence/DIGEST-LOG.md and
# 02_Marketing/intelligence/DIGEST-AUDIT.md (SI8-INTEL-NEWS-4C added the
# second file; both are always written by the same digest.py run, so they
# are committed and pushed together, atomically, through this one script --
# not as two separate git operations, which would double the race surface
# for no reason) in the current working tree, then reconciles with
# origin/main before pushing -- so a long-running News Intelligence run
# (minutes of retrieval plus several model calls) can safely persist its
# log entries even if unrelated commits (or another digest run's own log
# entries) reached origin/main while it was working. This is the exact
# race observed in Production: the workflow checks out main at SHA X, runs
# for several minutes, then does a plain `git push` from a commit still
# based on X -- rejected the moment origin/main has moved past X.
#
# Either file may be absent (e.g. a test harness that only seeds one of
# them, or a future caller that only updates one) -- only paths that
# actually exist on disk are staged.
#
# SAFETY GUARANTEES:
#   - never force-pushes (no `--force`/`-f`, ever);
#   - never resets or rewrites origin/main -- `git rebase origin/main`
#     replays ONLY this script's own pending commit on top of whatever
#     origin/main currently is; it never touches origin/main's own history;
#   - never silently discards a concurrent upstream commit -- rebasing
#     onto the fetched origin/main keeps every commit that's already
#     there;
#   - if Git cannot reconcile automatically (a genuine conflict -- most
#     likely two runs editing the exact same DIGEST-LOG.md insertion
#     point on the same day), the rebase is aborted and the script exits
#     non-zero: fails visibly, never guesses, never overwrites;
#   - retries a small, bounded number of times ONLY for the narrow window
#     where origin/main advances again between our rebase and our own
#     push -- never retries past a genuine conflict (that fails
#     immediately, on the first attempt).
#
# Usage: run from anywhere inside the repository, with DIGEST-LOG.md
# already updated on disk by the caller and HEAD checked out at the
# commit the workflow started from. The caller is responsible for
# `git config user.name`/`user.email` (mirrors the pre-existing workflow
# step's own convention) before invoking this script.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
LOG_PATH="$REPO_ROOT/02_Marketing/intelligence/DIGEST-LOG.md"
AUDIT_PATH="$REPO_ROOT/02_Marketing/intelligence/DIGEST-AUDIT.md"
MAX_ATTEMPTS="${PUSH_DIGEST_LOG_MAX_ATTEMPTS:-5}"

cd "$REPO_ROOT"

for path in "$LOG_PATH" "$AUDIT_PATH"; do
  if [ -f "$path" ]; then
    git add "$path"
  fi
done

if git diff --cached --quiet; then
  echo "No digest log changes to commit."
  exit 0
fi

git commit -m "digest: weekly article log $(date -u +%Y-%m-%d)"

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  echo "Digest log reconcile/push attempt $attempt/$MAX_ATTEMPTS..."
  git fetch origin main

  if git rebase origin/main; then
    if git push origin HEAD:main; then
      echo "Digest log pushed successfully."
      exit 0
    fi
    echo "Push rejected after a clean rebase -- origin/main advanced again during the push itself. Retrying..."
    attempt=$((attempt + 1))
    continue
  fi

  echo "::error::Digest log rebase onto origin/main could not be completed automatically -- a concurrent commit conflicts with this run's digest log update. Aborting the rebase; digest log NOT pushed this run. (Any News Intelligence email this run sent was already delivered independently of this step -- only log persistence is affected.)"
  git rebase --abort
  exit 1
done

echo "::error::Exhausted $MAX_ATTEMPTS reconcile/push attempts due to repeated concurrent upstream pushes. Digest log NOT pushed this run."
exit 1
