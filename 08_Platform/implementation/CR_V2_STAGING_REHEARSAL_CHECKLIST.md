# Staging Rehearsal Checklist — Creator Record v2 (CR-V2-MVP-M4C)

**Status:** PREPARED, NOT EXECUTED. Nothing below has been provisioned, deployed, migrated or paid. The end-to-end rehearsal (§7) waits for PM review of this configuration.

**Scope:** the minimum isolated environment to rehearse the existing Creator Record v2 journey once: invited creator → questionnaire → review → checkout (Stripe test mode) → webhook fulfilment → v2 PDF issued into private storage → ready email. No product change, no Production change.

**Code:** branch `work/cr-v2-mvp-m1` (M3 `b0ee26c8` → M4B `cf055410` → M4C). The runtime safeguard (M4B, `lib/creator-record/governed/publication-authority.ts`) and the synthetic test bundle (M4C, `governed/synthetic-test-authority.ts`) are both on this branch, and are safe to merge: Production can never select the synthetic bundle.

---

## 1. What exists today, and what does not

| Resource | Found | Notes |
|---|---|---|
| SI8 Production Supabase | `lehqgcgnenwdmuzudbrs` | Never touched by anything here. |
| Non-production SI8 Supabase project | **none** | No staging project has ever existed (see `REPORT_BINDING_STAGING_CHECKLIST.md`, which ran against Production with a disposable record). |
| Supabase CLI on this machine | logged into the **AI Penguins** org (Standing Encore project only) | Cannot see the SI8 project. **Do not create the staging project in this org by accident.** |
| Vercel CLI on this machine | **not logged in** | |
| Stripe CLI on this machine | linked to **Standing Encore** (`acct_1Rhl…`), keys expired 2026-02-25 | Not the SI8 account. |
| Credentials in the repo or worktrees | none | `.env.local` is empty; only `.env.local.example` templates. |

## 2. Supabase — separate staging project (operator)

1. In the **SI8** Supabase organization (the one that owns `lehqgcgnenwdmuzudbrs`), create a NEW project, e.g. `si8-cr-staging`. Its ref is a new 20-character id; record it as `STAGING_SUPABASE_REF`. It shares nothing with Production: separate database, storage, Auth users and keys.
2. Authentication → settings: **CAPTCHA protection OFF** (Turnstile has failed on previews before; staging uses none). Site URL and redirect URLs = the staging preview URL (§3).
3. Take the **direct** Postgres connection string (Settings → Database) as `STAGING_DATABASE_URL`. It contains the staging ref.
4. From `08_Platform/app`, with psql 15+:
   ```
   STAGING_SUPABASE_REF=<ref> STAGING_DATABASE_URL='<url>' bash scripts/staging/apply-staging-migrations.sh
   ```
   It refuses the Production ref, a URL that does not name the staging ref, and any non-empty database. It applies `08_Platform/supabase/migrations/001–006`, then every `08_Platform/app/supabase/migrations/*` through `20261102000000` (M3, including the M4B rollback guard). It ends by listing the private `creator-records` bucket and the three v2 guard triggers.
   - **Known break in a fresh history, handled:** `20260909000000_assessment_publications` refuses to apply unless Production's legacy record `ASSESS-005-2026-07-12` exists. The script runs `supabase/staging/before_20260909000000_assessment_publications.sql` immediately before it. That inserts a clearly labelled placeholder (system-test, `methodology_version = 'STAGING-PLACEHOLDER'`, no login). The placeholder also refuses to run where ASSESS-005 already exists, i.e. Production.
   - Applied with psql, so the CLI migration history is not written. **Do not run `supabase db push` against staging.**
5. Create the test creator: Authentication → Add user (auto-confirm), using an inbox you control. The auth trigger creates the `public.users` row.
6. Invite them to the v2 pilot:
   ```
   psql -X -v ON_ERROR_STOP=1 -v creator_email=<email> -f supabase/staging/seed_pilot_access.sql -d "$STAGING_DATABASE_URL"
   ```
   It refuses any database whose ASSESS-005 is not the staging placeholder, so it cannot write to Production.
7. Optional, V1 regression only: create a private `documents` bucket (Production made its bucket private by hand; no migration creates it). v2 does not use it.

Rehearsed locally (2026-11-01) on fresh PostgreSQL 15.19 with a minimal Supabase stub: 44/44 migrations applied, bucket private, guards present, re-run refused, seed refusal confirmed. **Not yet proven on real Supabase:** `006_storage_policies` against Supabase's managed `storage` schema ownership, and the auth trigger on a real `auth.users` insert.

## 3. Vercel — a separate project, Preview deployments only (operator)

Recommended: a **new Vercel project** (e.g. `si8-cr-staging`, root directory `08_Platform/app`). Its environment variables then hold only staging credentials, and the Production project `si8-creator-portal` and its env vars are not touched at all.

- Deploy **only as Preview.** The safeguard refuses `VERCEL_ENV=production` (`production_environment`), so a production deployment of the staging project fails closed by design.
- Use the stable branch alias URL (`<project>-git-<branch>-<team>.vercel.app`) for `NEXT_PUBLIC_SITE_URL`, the Supabase redirect URLs and the Stripe webhook.
- If Deployment Protection is on, create a "Protection Bypass for Automation" secret, so the Stripe webhook can reach the preview (§4).
- Vercel cron jobs do not run on Preview deployments. The payment sweep, if needed, is called by hand with `PAYMENT_SWEEP_SECRET`.

If the existing project must be used instead, every variable below must be set **for the staging git branch only** (Preview → specific branch). The project-wide Preview values may point at Production.

Preview environment (names only; values never committed or printed):

| Variable | Staging value |
|---|---|
| `SI8_CR_PUBLICATION_AUTHORITY` | `synthetic-isolated-test` |
| `SI8_CR_SYNTHETIC_SUPABASE_REF` | the staging ref |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<staging ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | staging project keys |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | SI8 Stripe **test-mode** keys (`sk_test_` / `pk_test_`) |
| `STRIPE_WEBHOOK_SECRET` | signing secret of the test-mode endpoint (§4) |
| `NEXT_PUBLIC_SITE_URL` | the staging branch alias URL |
| `RESEND_API_KEY` | existing Resend key (sends from the verified domain to the test inbox) |
| `ADMIN_EMAIL` | the operator's inbox |
| `PAYMENT_SWEEP_SECRET` | a fresh random value |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | **unset** |

**Preflight before every deploy** (no network, no secrets printed). Pull the staging Preview env to `.env.staging.local` (git-ignored by `.env*.local`; never another name), then:
```
npx tsx --env-file=.env.staging.local scripts/staging/cr-v2-staging-preflight.ts
```
It must print `PREFLIGHT PASS`. It checks:
- authority resolves to `synthetic_isolated_test`;
- the URL, anon key and service-role key name the same non-Production project;
- the Stripe keys are test-mode and the webhook secret is set;
- the site URL is not a Production host;
- Turnstile is unset.

It also prints the two stops.

## 4. Stripe — test mode (operator)

In the **SI8** Stripe account (not the Standing Encore account the local CLI is linked to), in test mode:
- Add a webhook endpoint `<staging URL>/api/webhooks/stripe` (plus `?x-vercel-protection-bypass=<secret>` if protected), with the same events as the live endpoint. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
- No product or price setup is needed: checkout sends inline `price_data`. Pay with test card `4242 4242 4242 4242`. A test-mode 100% promotion code is optional.
- Live mode is untouched.

## 5. The stops — the only staging-only code change

Both stops are code constants, `stopped` by default, and stay `stopped` on `work/cr-v2-mvp-m1` and `main`. The rehearsal build needs exactly this two-line change, on a staging branch that is never merged:

```diff
--- lib/creator-record/customer-flow/approved-inputs.ts
-export const CREATOR_RECORD_V2_SUBMISSIONS: SubmissionsMode = 'stopped'
+export const CREATOR_RECORD_V2_SUBMISSIONS: SubmissionsMode = 'open'
--- lib/creator-record-artifacts/config.ts
-export const CREATOR_RECORD_V2_ISSUANCE: V2IssuanceMode = 'stopped'
+export const CREATOR_RECORD_V2_ISSUANCE: V2IssuanceMode = 'enabled'
```

- **It cannot merge green.** With the flip applied, seven test suites fail: `customer-flow`, `customer-purchase`, `publication-authority`, `synthetic-test-authority`, `v2-issuance-stop`, `admin-retry-v2-stop` and `renderer-registry`. All of them assert both stops are `stopped`.
- **If it reached Production anyway, it still fails closed.** Production resolves to the governance bundle, which is empty, so nothing prepares, sells or issues. It never selects the synthetic bundle.
- **Restore immediately** by deleting the staging branch, or deploying `work/cr-v2-mvp-m1` HEAD (both stops `stopped`) to the staging project. The submissions stop blocks new preparation, and the issuance stop blocks rendering on every path: webhook, sweep, reconcile and admin retry. A paid v2 submission then stays paid-but-not-issued, which is visible. For a full stop, also unset `SI8_CR_PUBLICATION_AUTHORITY`: authority falls back to empty governance.

## 6. Synthetic test authority (M4C)

`governed/synthetic-test-authority.ts`:
- **Questionnaire:** a reduced 12-question set. It reuses the question ids the product code reads, but every visible string is new `[TEST ONLY]` text.
- **Approvals:** all are in the name of `SYNTHETIC TEST AUTHORITY (staging rehearsal only; no SI8 decision)`.
- **Ledger:** five SYN-* entries for real governed claim ids: Pika baseline, Pika Standard, Kling baseline, Kling Member and Artlist. Each carries placeholder explanations, so the real retrieval pipeline runs but no guidance wording is published.
- **PDF templates:** stamped `SYNTHETIC TEST RECORD · STAGING REHEARSAL ONLY · NOT A CREATOR RECORD`.
- **Digests:** the source-text digest and template fingerprint are pinned, as a real approval would pin them.

Enforced by `__tests__/creator-record/synthetic-test-authority.test.ts`:
- every visible string is marked as test text;
- no pilot wording, and type-only imports;
- the identities are canonical and the claim dates current;
- the digests are pinned;
- it is selected only under the isolated conditions, where it prepares, is eligible and renders a visibly synthetic record;
- every Production or unsafe environment refuses it.

## 7. The rehearsal (NOT YET AUTHORIZED)

Only after PM review of §2–§6, and with `PREFLIGHT PASS`:
1. Sign in to the staging preview as the test creator, then open `/creator-record`.
2. Complete the questionnaire (e.g. tool Pika, plan Standard; music Artlist), review, and continue to checkout with card 4242.
3. Expect:
   - webhook `200`;
   - `submissions.payment_status = 'paid'`;
   - one `creator_record_artifacts` row with generator `creator-record-v2-pdf-v1` and an object in the private `creator-records` bucket;
   - the PDF stamped SYNTHETIC TEST RECORD;
   - the ready email in the test inbox;
   - no `rights_packages` row.
4. Restore (§5).
5. Record the results here.
