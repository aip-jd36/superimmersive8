# CAA-SECURITY-3B FIX-1 — Zero-total `paid` Checkout sessions: Production runbook

**Status:** EXECUTED in Production 2026-10-21 (see [Execution record](#execution-record-2026-10-21)). CAA-SECURITY-3B-M2-2 **CLOSED / PASS for the Creator Record $0 path only** (see [M2-2 milestone disposition](#caa-security-3b-m2-2-milestone-disposition)); broader CAA-SECURITY-3B release gates remain open (see [Open items](#open-items-retained)).
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
- **Now in effect (2026-10-21):** UAT-3B-CR2 is an accepted `paid` $0 row, so the old constraint can no longer be re-added as a validated constraint.
  - **Reversing FIX-1 against existing accepted payment history is unsafe and not permitted.** That means editing, deleting or re-classifying accepted ledger rows.
  - **Future behaviour can still be changed by forward remediation.** A new, separately reviewed forward migration can tighten the rule for new sessions only (e.g. a function change, or a constraint added `NOT VALID`), leaving recorded history untouched.
  - **Immediate containment** remains the promotion-code switch above.

## Execution record (2026-10-21)

All times UTC. "Operator" = PM/JD in the Stripe Dashboard, Supabase SQL Editor or Vercel. Values below are as observed and reported at the time; nothing here is inferred.

| Step | Evidence |
|---|---|
| Release gate 1 (incident payload) | Operator, Stripe Dashboard: original `checkout.session.completed` event was livemode, `complete` / `payment` / `paid`, `payment_intent` null, `usd`, subtotal 2900, discount 2900, total 0, tax 0, shipping 0, exact submission/session binding, webhook delivery 200 OK. Adaptive Pricing presented TWD while the session currency stayed USD. **PASS.** |
| Release gate 2 (positive-amount event on 2026-02-25.clover) | **Not supplied.** PM accepted it as an open release limitation (see open item 1). Not a PASS. |
| Tests before release | Payment-ledger DB suite 97/97, 0 skipped on local PostgreSQL 15.18 and 17.6. GitHub Actions *SI8 Payment Ledger DB Tests* (PostgreSQL 15): run `39622645567` (branch) and run `39624023457` (`main`), both `suites=1 tests=97 passed=97 failed=0 skipped=0`. Full unit suite: same 82 failures as the `eb5d8ad` baseline, none in payments/security/db, 0 new. |
| Integration | Commit `e62e115548232efb909bcc7b5605514c09b69774` (9 files, no application runtime change). `main` fast-forwarded `eb5d8ad → e62e115`, no force. Vercel Production deployment of `e62e115` **Ready**: operator-verified in the Vercel dashboard, not independently CLI-verified at that checkpoint (the CLI's GitHub deployment-API check was rate-limited at the time). Subsequently corroborated, after the milestone checkpoint, by independent CLI inspection of GitHub deployment records for `e62e115`: Production – si8-creator-portal `7230016379` success 15:30:50; Production – superimmersive8 `7230023016` success 15:31:07; Production – superimmersive8-crm `7230048038` success 15:32:14. |
| Preflight (`CAA_3B_FIX_1_PREFLIGHT.sql`, SHA-256 `5b7b539e…d43a`, from commit `e62e115`) | 15:33:08Z: rows 1–12 PASS, 0 BLOCKER. Ledger 1 row, 0 accepted, 1 incident-class rejected. Fingerprint `fe8161311380d14c8bfc4770c086b372`. |
| Migration (`20261022000000_payment_zero_total_paid.sql`, SHA-256 `651d832c11c40c8cd3845e6d420e03ac227a15b94d68d3d3607f5fd8f090eea0`) | Copied byte-exact from the committed Git object; clipboard SHA-256 verified. SQL Editor: `Success. No rows returned`. |
| Verify (`CAA_3B_FIX_1_VERIFY.sql`, SHA-256 `5d5f8994…b6ef`) | 15:35:34Z: rows 1–13 PASS. Ledger rows 1 → 1, incident-class rejected 1 → 1, fingerprint `fe8161311380d14c8bfc4770c086b372` unchanged. |

## CAA-SECURITY-3B-M2-2 milestone disposition

**CLOSED / PASS — 2026-10-21.** Scope, exactly: *Creator Record fully discounted $0 live Checkout through payment acceptance, automated approval, PDF issuance and email notification, with Production ledger integrity verified.*

This does **not** extend to positive-amount Creator Record payments, to SI8 Certified, to the recovery sweep, or to payment paths in general.

### UAT-3B-CR2 evidence

Submission `5a5bd960-9394-44f2-b06b-6713d4edf1ad`, film *UAT-3B-CR2*, Creator Record ($29 list price). Live Stripe Checkout with a 100% promotion code, $0 charged. `complete` / `payment` / `paid`, PaymentIntent NULL. Stored Checkout Session suffix `Y2uLhE`.

Production ledger inspection (read-only `UAT_LEDGER_1_CR2` query, SHA-256 `21e94c84…5322`), 15:50:37Z:

| Requirement | Observed |
|---|---|
| Ledger row for the stored session | Exactly 1, bound to this submission (`session_binding = bound`) |
| Outcome / reason / anomaly | `accepted` / `accepted` / `none` |
| Tier / currency | `creator_record` / `usd` |
| Expected / subtotal / discount / total (USD cents) | 2900 / 2900 / 2900 / 0; tax 0, shipping 0 |
| Submission | `payment_status = paid`, `status = approved`, `amount_paid = 0` |
| Fulfillment / PDF / email (recorded states) | `completed` / `completed` / `accepted`. PDF and email step timestamps set, provider acceptance recorded. No active claim, `last_error` or reconciliation entry. 1 attempt. |
| Duplicates / attention | No duplicate ledger record for this submission. No other open anomaly. No `failed` / `needs_reconciliation` / `in_progress` row. |

Customer-facing verification (operator, manual observation):

- The dashboard showed UAT-3B-CR2 as **Approved** and **Paid**.
- The Creator Record "ready" email was received by the customer account, and the auto-approval notification by the administrator. Receipt was observed in both inboxes. Note that the ledger's `email_status = accepted` only proves Resend accepted the customer email, and the admin notification is not tracked in the ledger at all.
- The two-page PDF was downloaded and inspected. Record ID `CR-2026-5A5BD960`. It contains the test title, tool disclosure, self-attestation and the prominent *SELF-ATTESTED — NOT FOR COMMERCIAL USE* designation.

### Incident preservation (UAT-3B-CR)

- Submission `a358156c-8475-4c60-a0b3-87f0ca751a94` remains `pending` / `unpaid`.
- Its ledger row remains `rejected` / `payment_status_inconsistent`, with the anomaly open.
- Row fingerprint `fe8161311380d14c8bfc4770c086b372`, identical to the FIX-1 preflight.
- Not reconciled, replayed or modified.

### Evidence → conclusion

| Conclusion | Supported by |
|---|---|
| Stripe's real $0 shape is `paid` / total 0 / no PaymentIntent | Release gate 1 (incident payload) |
| FIX-1 is applied as reviewed and changed no history | Migration SHA match; verify 13/13; unchanged fingerprint |
| A $0 Creator Record payment is accepted, bound and approved | Ledger inspection rows above; dashboard |
| PDF issuance works on this path | `pdf_status = completed` + PDF row; PDF downloaded and inspected |
| Email notification works on this path | `email_status = accepted` + provider id (provider acceptance); manual receipt in both inboxes (delivery) |
| Ledger integrity holds | One row per session, no duplicates or extra anomalies, incident row unchanged |

## Open items (retained)

None of these are closed by M2-2.

| # | Item | Status |
|---|---|---|
| 1 | Positive-amount Creator Record Checkout ($29 actually charged) on Stripe webhook API version 2026-02-25.clover | **NOT LIVE-VERIFIED.** An accepted, unresolved release limitation, not a PASS. |
| 2 | SI8 Certified $0 Production UAT | **DEFERRED** by PM decision, neither completed nor passed. Payment must never imply automatic certification. |
| 3 | UAT-3B-CR rejected payment and open anomaly | Awaiting separately authorized reconciliation (`resolve_anomaly` with a note). Do not replay. |
| 4 | Creator Record detail page copy says "Approved — Rights Verified" | May overstate self-attested rights assurance. Product/legal-copy review. Not changed here. |
| 5 | Certified upsell copy in the Creator Record PDF/email ("CLEARED FOR COMMERCIAL USE"; universal requirements for brand placements, agency deliverables, streaming, E&O) | Flagged for separate product/legal-copy governance review. Not changed here. |
| 6 | Production/Preview credential isolation; payment-history retention policy | Governed open decisions (accepted deferred risk / interim preservation hold). Unchanged. |
| 7 | Scope of this UAT | Not evidence of broader payment-path or recovery-sweep correctness. |
