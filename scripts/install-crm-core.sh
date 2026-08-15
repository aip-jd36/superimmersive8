#!/usr/bin/env bash
# Wrapper for the Vercel Install Command. Kept as a script, rather than
# one long inline command, because Vercel's Install Command field has a
# 256-character limit -- the full fetch + npm install + Next.js-detection
# symlink sequence exceeds that. Called via (from 03_Sales/crm-deploy,
# this project's Root Directory):
#   bash ../../scripts/install-crm-core.sh
#
# Resolves its own location so it works regardless of how it's invoked,
# rather than assuming a starting cwd.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$REPO_ROOT"
bash scripts/fetch-crm-core.sh

cd tools/crm-core/dashboard
npm install

cd "$REPO_ROOT/03_Sales/crm-deploy"
mkdir -p node_modules
ln -sfn "$REPO_ROOT/tools/crm-core/dashboard/node_modules/next" node_modules/next
