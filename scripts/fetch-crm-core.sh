#!/usr/bin/env bash
# Explicit fetch for pmf-crm-core, used because Vercel's native git
# submodule fetching is unreliable for Git-integration (push-to-deploy)
# deployments -- confirmed during Standing Encore's migration onto this
# repo as a known, long-standing Vercel platform limitation, not a config
# mistake. Every build attempted via Vercel's normal "Connected Git
# Repository" flow logged "Warning: Failed to fetch one or more git
# submodules" and left the submodule directory empty, even after:
#   - granting the Vercel GitHub App explicit access to this repo
#   - making this repo fully public (independently verified anonymously
#     cloneable via a raw HTTP request to
#     .../info/refs?service=git-upload-pack -- 200, no auth needed)
#   - disconnecting and reconnecting the Git integration on the Vercel
#     project
# An SSH-vs-HTTPS URL mismatch was specifically checked and ruled out
# first (Vercel only supports HTTPS submodule URLs) before concluding
# this is a platform limitation, not something fixable via settings.
#
# DO NOT ASSUME THIS SCRIPT IS OPTIONAL BOILERPLATE. Without it (i.e. if
# you rely on Vercel's native submodule fetch instead), the deploy will
# fail with exactly the warning described above and the build's Install
# Command will error with "No such file or directory" trying to enter the
# submodule path.
#
# This script clones pmf-crm-core fresh, checks out a PINNED COMMIT (not
# a moving branch tip), and copies the result into place -- called from
# the consuming repo's Vercel Install Command, before `npm install`. See
# docs/ADOPT_NEW_ENTITY.md for full setup instructions.
#
# ---
# SETUP: copy this file to your own repo's scripts/fetch-crm-core.sh,
# then fill in the pinned SHA below. Get the current commit with:
#   git -C tools/crm-core rev-parse HEAD
# (assuming you've already added the submodule per docs/ADOPT_NEW_ENTITY.md
# step 1 -- this script's SHA doesn't have to come from a submodule
# checkout specifically, just from whatever commit of pmf-crm-core you
# want this deployment to run).
#
# Update this value any time you intentionally want this deployment to
# pick up a newer version of pmf-crm-core -- it will NOT track main
# automatically, by design (a Vercel build should be reproducible from a
# known-good commit, not silently pick up whatever's newest at build
# time). Check pmf-crm-core's own CHANGELOG.md for what changed before
# bumping.
CRM_CORE_SHA="5f126119024545853bcd028519cd276094e83a28"

set -euo pipefail

CRM_CORE_URL="https://github.com/aip-jd36/pmf-crm-core.git"
TARGET_DIR="tools/crm-core"

fail() {
  echo "fetch-crm-core.sh: ERROR: $1" >&2
  exit 1
}

if [ "$CRM_CORE_SHA" = "REPLACE_WITH_PINNED_COMMIT_SHA" ]; then
  fail "CRM_CORE_SHA is still the placeholder value -- fill in a real pinned commit SHA before using this script (see the SETUP comment above)"
fi

echo "fetch-crm-core.sh: fetching pmf-crm-core @ ${CRM_CORE_SHA}"

TMP_DIR="$(mktemp -d)" || fail "could not create temp directory"
trap 'rm -rf "$TMP_DIR"' EXIT

git clone --quiet "$CRM_CORE_URL" "$TMP_DIR" \
  || fail "clone of $CRM_CORE_URL failed"

git -C "$TMP_DIR" fetch --quiet origin "$CRM_CORE_SHA" \
  || fail "could not fetch commit $CRM_CORE_SHA -- check the SHA is correct and pushed to pmf-crm-core's main branch"

git -C "$TMP_DIR" checkout --quiet "$CRM_CORE_SHA" \
  || fail "could not check out commit $CRM_CORE_SHA"

ACTUAL_SHA="$(git -C "$TMP_DIR" rev-parse HEAD)"
[ "$ACTUAL_SHA" = "$CRM_CORE_SHA" ] \
  || fail "checked-out SHA ($ACTUAL_SHA) does not match pinned SHA ($CRM_CORE_SHA)"

# Vercel's failed native submodule attempt may leave this empty or
# partially populated -- start clean.
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"

# Plain source checkout at TARGET_DIR, not a nested git repo.
cp -a "$TMP_DIR"/. "$TARGET_DIR"/
rm -rf "$TARGET_DIR/.git"

[ -f "$TARGET_DIR/dashboard/package.json" ] \
  || fail "expected $TARGET_DIR/dashboard/package.json after fetch -- copy may have failed"

echo "fetch-crm-core.sh: OK, pmf-crm-core @ ${CRM_CORE_SHA} is now at ${TARGET_DIR}/"
