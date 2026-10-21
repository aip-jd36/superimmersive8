# CAA-SECURITY-3B FIX-1 — Zero-total `paid` Checkout sessions: Production runbook

**Status:** PREPARED, NOT EXECUTED. Requires an explicit PM GO for each gated step.
**Incident:** CAA-SECURITY-3B-M2-2-INCIDENT-1 (UAT-3B-CR, 100% promotion, rejected `payment_status_inconsistent`).

## What changes

| Object | Change |
|---|---|
| `record_checkout_payment()` | `paid` branch only. Positive total: well-formed `pi_…` required (unchanged). Zero total: accepted as `paid` only with **no** PaymentIntent; a PaymentIntent on a $0 session is rejected. Every other line is byte-identical to `20261021000000` (static test enforces this). |
| `pf_accepted_payment_facts` | One added arm: `paid` AND `amount_total = 0` AND `stripe_payment_intent_id IS NULL`. |
| Everything else | Unchanged: binding, tier/list price, USD, subtotal = price, full-discount arithmetic, tax/shipping, session complete, payment mode, duplicate detection, legacy cutoff, replay, fencing, reconciliation, grants, `no_payment_required` handling. No application code changes, so **no Vercel deployment is required for the fix to take effect.** |

Files:

- Migration: `08_Platform/app/supabase/migrations/20261022000000_payment_zero_total_paid.sql`
- Preflight (read-only): `08_Platform/implementation/caa-3b/CAA_3B_FIX_1_PREFLIGHT.sql`
- Verify (read-only): `08_Platform/implementation/caa-3b/CAA_3B_FIX_1_VERIFY.sql`

## Release gate (read-only, before any Production write)

Operator, Stripe Dashboard, live mode. View only: no resend, no refund, no edits.

1. **Incident event.** Open Developers → Webhooks → the production endpoint → the `checkout.session.completed` attempt for the incident session. In the *request body sent to the endpoint* (this uses endpoint API version 2026-02-25.clover, not the Dashboard's display version), confirm all of these:
   - `payment_status = "paid"`
   - `amount_total = 0`
   - `amount_subtotal = 2900`
   - `total_details.amount_discount = 2900`
   - `payment_intent = null` (present and null, or absent)
   - `currency = "usd"`
   - Record any `presentment_details` (TWD display) for the file.

   **If `payment_intent` is a `pi_…` value: STOP.** FIX-1's $0 rule does not match Stripe and must be redesigned.
2. **Positive-amount evidence.** Find one genuine positive live `checkout.session.completed` delivery to this endpoint on version 2026-02-25.clover. Confirm `payment_status = "paid"`, `amount_total > 0` and `payment_intent` = `pi_…`.

   **If none exists,** record that as an open risk. The first real positive payment after FIX-1 becomes the proof, and must be checked within 1 hour using `M2_2_UAT_EVIDENCE`-style read-only SQL.

## Production steps (each needs explicit PM GO)

| # | Who | Step | Expected evidence |
|---|---|---|---|
| 0 | OP | Integrity check: SHA-256 of the migration file equals the value in the FIX-1 report; copy to the clipboard from disk (byte-exact path). | Hash match |
| 1 | OP | Run `CAA_3B_FIX_1_PREFLIGHT.sql` in the SQL Editor. | Rows 1–12 `PASS`, no `BLOCKER`. Save rows 13–16 (INFO), including the ledger fingerprint. Row 15 is expected to be 1 (UAT-3B-CR). |
| 2 | OP | Run the migration file once as a whole script. The SQL Editor runs a multi-statement script in one transaction; if anything errors, nothing persists. | `Success. No rows returned` |
| 3 | OP | Run `CAA_3B_FIX_1_VERIFY.sql`. | Rows 1–13 `PASS`. Row 16 fingerprint **identical** to preflight row 16; rows 14/15 identical to preflight rows 15/13. |
| 4 | OP | Re-run the preflight (optional sanity). | Rows 6, 7, 9 now `BLOCKER`, meaning it is already applied. This is expected, and prevents a second application by mistake. |
| 5 | PM | Decide containment release: re-activate 100% COMP codes (if deactivated). | Decision recorded |
| 6 | PM/OP | Repo parity: merge FIX-1 to `main` through the usual gate. The Vercel redeploy carries no app-code change. CI DB suite runs on PG 15. | CI green |
| 7 | OP | Restart M2-2 UAT with a **new** submission (`UAT-3B-CR2`) and a **new** 100% code (COMP-JD is consumed). | Ledger `accepted / accepted / bound`, `paid`, total 0, `payment_intent_is_null` true, then the normal fulfillment evidence |

Ordering: the migration only needs `20261021000000` (it refuses to run otherwise, `55000`). It does not depend on any app deploy. Applying it before or after the repo merge is safe because the application code is unchanged.

## What FIX-1 does NOT do

- **It does not re-evaluate the incident session.** A replay returns the stored `rejected` outcome, by design. UAT-3B-CR stays `pending/unpaid` and cannot start a new checkout (its bound session is complete, so create-session returns 409). It remains as audit evidence under the preservation hold.
- After FIX-1, an admin may close its anomaly with `resolve_anomaly` and a note, under separate authorization.
- It does not touch any existing ledger row (the verify fingerprint proves it).

## Stop conditions

- Preflight `BLOCKER` → stop, report.
- Migration error → nothing persisted (single transaction); stop, report the SQLSTATE.
- Verify `FAIL`, or the fingerprint differs → stop. Do not re-run the migration. Report.
- First post-FIX $0 session not `accepted / accepted / bound`, or Certified approved → stop. Deactivate the 100% codes.

## Rollback limitations

- Forward-only. There is no down script.
- Restoring the old rule means a new forward migration with the old function and constraint. That migration's constraint re-validation **fails once any accepted `paid` $0 row exists**, so after the first successful $0 acceptance a true revert is no longer possible without rewriting history (not permitted).
- Practical containment instead: deactivate the 100% promotion codes in Stripe. No $0 sessions means the changed path is unreachable.
- Promoting an older Vercel deployment does nothing for FIX-1 (the change is database-only) and re-exposes the pre-3B checkout/webhook flaws. Do not use it for FIX-1.
