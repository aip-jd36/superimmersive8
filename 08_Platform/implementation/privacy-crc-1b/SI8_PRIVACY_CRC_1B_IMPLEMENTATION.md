# SI8-PRIVACY-CRC-1B — CRC privacy disclosure and raw-IP retention (local implementation record)

**Status:** local implementation only, on branch `work/si8-privacy-crc-1b` (from `main` `a3c0e098`). Not pushed, merged,
deployed, or applied to any database. **Implemented code is not approved public policy.**

## What this branch does, and what deploying it would change

| Piece | State in this branch | Effect if deployed as is |
|---|---|---|
| CRC privacy notice slot `CRC_PRIVACY_NOTICE` (`lib/legal/crc-privacy-notice.ts`) | approved bilingual copy (`SI8-PRIVACY-CRC-5-20261117`), effective date pending (CRC-5) | none until the date is set: `/crc/privacy` shows "This document is not available yet." (noindex) |
| Results-gate privacy link (`components/crc/ResultsGatePrivacyLink.tsx`) | renders only when the notice is published | none: no link is shown |
| Disclosure version (`lib/crc-engine/results-gate-disclosure.ts`, SI8-PRIVACY-CRC-1C) | the page reports the version its gate rendered; the server records it | none: the gate renders v1 and reports `results-gate-v1` |
| Raw-IP retention function (migration `20261118000000`) | file only | none: Vercel does not apply migrations |
| Retention route `POST /api/internal/crc/raw-ip-retention` | requires `CRC_RAW_IP_RETENTION_SWEEP_SECRET` | returns 503 (not configured); no database call |
| Workflow `.github/workflows/crc-raw-ip-retention.yml` | gated by `CRC_RAW_IP_RETENTION_ENABLED` (unset) | the daily run skips; the secret is never read |

The approved Commercial Assurance follow-up sentence (EN and zh-TW) is unchanged and covered by a test.

## Workstream A — notice and gate

- Draft notice: `CRC_PRIVACY_NOTICE_DRAFT.md` (this folder), with its publication gate. Not used by the application.
- Gate link wording (DRAFT, approved with the notice):
  - EN: "Read the **Commercial Readiness Check Privacy Notice**."
  - zh-TW: "請參閱**商業就緒度檢查隱私權聲明**。"
  The link opens `/crc/privacy` in a new tab, so the visitor keeps their results-gate state. It renders directly below the
  follow-up sentence.
- Versioning (corrected in SI8-PRIVACY-CRC-1C): `crc_sessions.capture_notice_version` records the disclosure the visitor's gate
  actually rendered, not the server's current policy.
  - The page makes one decision (`resultsGateDisclosure()`), which both shows or hides the link and supplies
    `resultsGateDisclosureVersion` sent with the email. The server validates it against the allowlist (`results-gate-v1`,
    `results-gate-v2`) and records it as given; it never consults its own published policy.
  - A visitor who saw the v1 gate before publication and submits after the publishing deploy is recorded as v1.
  - Unsupported or malformed values are refused with a 400 before any lead write, claim or send (fail closed). The field is
    refused on any request that is not an email submission.
  - Compatibility assumption: a request with no version comes from a page build before 1C. Every such build rendered only the
    v1 gate (no link), so it is recorded as `results-gate-v1`. This holds because the link and the field ship together in the
    same build; a test enforces that the page uses one decision for both.
  - An explicit resend renders no gate and writes no version. Earlier sessions are never rewritten.

To publish (later, after approval): fill `CRC_PRIVACY_NOTICE` with the approved text, version, effective date and approval
reference in one reviewed change. The link, the page and v2 then switch on together.

## Workstream B — raw-IP retention

> **Not in the notice release (SI8-PRIVACY-CRC-6).** The notice was released to `main` from `release/si8-privacy-crc-notice`,
> which leaves out every Workstream B file (workflow, internal route, runner, migration `20261118000000`, preview SQL and their
> tests). They remain on `work/si8-privacy-crc-1b` for a separately authorized release.

**Scheduler verification (B1).**

- **Existing pattern (chosen):** GitHub Actions workflows call bearer-protected internal routes (`payment-fulfillment-sweep.yml`
  hourly; `creator-record-retention-sweep.yml` every 6 h, behind an activation variable). The routes share
  `lib/payments/sweep-auth.ts`, which compares in constant time and fails closed. This branch copies the gated retention-sweep
  shape exactly.
  - Not verified from this environment: whether those two workflows have actually run recently, and which repository
    secrets and variables are set. The `gh` CLI is unavailable here, and the user instructed not to poll GitHub's API. In 1C a
    single read of the run history was attempted and could not be made.
  - Static workflow tests (1C, `__tests__/crc-engine/raw-ip-retention-workflow.test.ts`): daily schedule plus manual dispatch,
    read-only token, no overlapping runs; a secret-free gate job decides from `CRC_RAW_IP_RETENTION_ENABLED` compared in the
    shell (executed against 8 values, including an injection attempt); only the sweep job holds the secret, whose name and
    endpoint match the route; a missing secret exits 1 before any request; any non-2xx fails the job; no verbose output.
  - GitHub disables scheduled workflows after 60 days without repository activity; check the workflow is still enabled
    before relying on it.
- **`pg_cron`:** available on the Supabase project but not installed (`pg_extension` count 0, 2026-11-17). Using it would be a
  Production configuration change. Not used.
- **Vercel cron:** the root `vercel.json` and `03_Sales/crm-deploy/vercel.json` declare `/api/cron/sweep`. No such route exists
  in this repository, so that cron is not a working mechanism for the app. Not used, not changed.

**Implementation (B2).** `clear_expired_crc_pilot_raw_ip(p_limit integer DEFAULT 1000)`:

- sets `raw_ip = NULL` where `raw_ip IS NOT NULL AND created_at < now() - 30 days`;
- runs oldest first, at most `p_limit` rows (1 to 10000), and skips rows locked by another run (`FOR UPDATE SKIP LOCKED`);
- keeps every row and every other column; touches no other table;
- returns only `(cleared, remaining_expired)`;
- runs as `SECURITY INVOKER` with a fixed `search_path`; EXECUTE is revoked from PUBLIC, `anon` and `authenticated` and granted to
  `service_role` only.

The app runner (`lib/crc-engine/raw-ip-retention.ts`) logs only the database error code, never a message, detail or address.

**Read-only preview (B4).** The query is `RAW_IP_RETENTION_PREVIEW.sql`. Its result on 2026-11-17 (aggregate counts only):

- 20 rows hold a raw IP: all `rate_limited`, created 2026-08-13 to 2026-09-28;
- 20 would be cleared by a first run today;
- the table has no triggers.

## Production dependencies, in order (none done; each needs authorization)

1. Founder approval to apply migration `20261118000000` to Production. Applying it does not clear anything.
2. Merge and deploy the branch.
3. Set the Vercel Production env var and the GitHub secret `CRC_RAW_IP_RETENTION_SWEEP_SECRET` (at least 32 characters,
   identical in both).
4. **Separate founder authorization for the first run**, which clears the 20 existing addresses permanently. Then set the GitHub
   variable `CRC_RAW_IP_RETENTION_ENABLED=true`, or run the workflow manually once.
5. After it has run in Production, the notice may state the 30-day period.
6. The CRC notice publication gate (`CRC_PRIVACY_NOTICE_DRAFT.md`) is separate and independent of steps 1–5.

## Tests

- Unit: `__tests__/legal/crc-privacy-notice.test.ts` and `__tests__/crc-engine/raw-ip-retention.test.ts` are new.
  `results-email-delivery.test.ts` gains a v1 assertion.
- 1C: `__tests__/crc-engine/results-gate-disclosure-provenance.test.ts` (provenance scenarios, invalid values, resend) and
  `__tests__/crc-engine/raw-ip-retention-workflow.test.ts` (scheduler contract) are new; `crc-privacy-notice.test.ts` gains
  publication-safety checks.
- Migration tripwires extended for `20261118000000`:
  - `live-evaluation.test.ts`
  - `live-examination-real.test.ts`
  - `creator-record-artifacts/migration-and-boundaries.test.ts`
- PostgreSQL: `__tests__/db/crc-raw-ip-retention.db.test.ts` applies the migration verbatim to a table with the Production shape.
  It uses synthetic TEST-NET rows only. CI picks it up through `payment-ledger-db-tests.yml` (path `__tests__/db/**`).
