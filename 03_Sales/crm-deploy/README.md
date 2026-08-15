# crm-deploy — Vercel anchor folder only

This folder contains **no real application code**. It exists purely so the CRM dashboard's
Vercel project can have its own `vercel.json` and `package.json`, completely separate from the
ones at this repo's actual root (which serve `superimmersive8.com` and must never be touched by
the CRM deployment).

- `vercel.json` — this deployment's real cron config (not a `.example` template — edit the
  schedule directly here if needed).
- `package.json` — exists only so Vercel's Next.js version-detection finds a `next` dependency
  declared at this project's Root Directory. Nothing here is actually installed/run from this
  `package.json`; the real app lives in `tools/crm-core/dashboard/` and is built via the Vercel
  project's Install/Build/Output command overrides (see below).

## Vercel project settings (this deployment only)

- **Root Directory**: `03_Sales/crm-deploy`
- **Install Command**:
  ```
  cd ../.. && REPO_ROOT="$(pwd)" && bash scripts/fetch-crm-core.sh && cd tools/crm-core/dashboard && npm install && cd "$REPO_ROOT/03_Sales/crm-deploy" && mkdir -p node_modules && ln -sfn "$REPO_ROOT/tools/crm-core/dashboard/node_modules/next" node_modules/next
  ```
- **Build Command**:
  ```
  cd ../../tools/crm-core/dashboard && npm run build
  ```
- **Output Directory**:
  ```
  ../../tools/crm-core/dashboard/.next
  ```
- Env vars: `DATA_PATH=../../../03_Sales/crm`, `ORG_NAME=SI8` (or `SuperImmersive 8`),
  `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO`, `CRON_SECRET` — this entity's own values, never
  shared with Standing Encore's deployment.

See `tools/crm-core/docs/ADOPT_NEW_ENTITY.md` for the general pattern this is based on, and why
the fetch script exists (confirmed Vercel platform limitation with native git submodule
fetching).
