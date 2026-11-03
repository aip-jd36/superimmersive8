# CR-V2-PROD-UAT-B: Operator Synthetic Examination UAT Runbook

**Status: reviewed tooling only. Running any step against staging or Production needs its own explicit approval.**
**Production progress:**
- **Steps 1–2 (preflight, migrations): done on 2026-11-03** (operator-reported). See `08_Platform/implementation/CR_V2_PROD_UAT_D_MIGRATION_RECORD.md`.
- **Steps 3–10 (test identity, grant, status, seed, one examination, history, revocation, evidence): done on 2026-11-03.** Operator-reported PASS; E4 is verified and closed (PM GO). See `08_Platform/implementation/CR_V2_PROD_UAT_E4_EXAMINATION_RECORD.md`.
  - The only grant is revoked, and `rollback_20261105.sql` is now permanently unusable.
  - Step 10's read-only database reconciliation matched every expected value.
  - Step 10's optional Storage-log comparison was **not performed**.
- **Any further grant needs a new approval and a new code.**

## Scope

- One designated SI8 test identity and one committed synthetic fixture.
- At most 2 hours, at most 4 examination-read events, and at most 1 newly saved run.
- Replay only. The examination envelope stays v2, unchanged.
- No route is added, and the customer submission, issuance, real-document and live-extraction stops are untouched.

## Files

| File | Who runs it | What it does |
|---|---|---|
| `create_grant.sql` | Database operator, SQL Editor | Creates the one grant, after placeholder, target and identity checks |
| `revoke_grant.sql` | Database operator, SQL Editor | Revokes every unrevoked grant. **Deletes nothing.** |
| `rollback_20261105.sql` | Database operator | Removes `20261105000000`, **only while no grant has ever existed**, then re-applies `20261104000000` verbatim |
| `scripts/creator-record-v2-uat/examination-uat.ts` | Operator shell | `nonce`, `status`, `seed`, `examine` and `history`. It cannot create, extend, widen or revoke a grant, and never deletes, removes or overwrites anything. |

## Order of operations

1. **Preflight.** Run `supabase/verification/cr-v2-uat-preflight`, U1–U4, and stop on any mismatch.
2. **Migrations.** Apply `20261104000000`, then `20261105000000`, in the transactional wrapper: `production-apply/` (01 → 02 → 03 → 04; see its README for the exact sequence, failure handling and rollback limits).
   - Then reload the PostgREST schema cache with `NOTIFY pgrst, 'reload schema';`. Without the reload, the API may keep serving the old function signatures and columns until it next reloads on its own.
   - Afterwards U1 must return every value `true`.
3. **Test identity.** Create one dedicated user: auto-confirmed, an obviously synthetic address, a random password that is thrown away. Do **not** invite it to the pilot.
4. **Code.** Run `examination-uat.ts nonce`. Keep the code in this shell as `SI8_UAT_NONCE` and paste only its SHA-256 into `create_grant.sql`.
5. **Grant.** Edit the `EDIT` constants and run `create_grant.sql`.
6. **Status.** Run `status --target <t> --expect-ref <ref>`. Every target check must pass, and the grant must be active and unbound.
7. **Seed.** Run `seed --fixture-file <committed fixture file>`. The database binds the grant to this document, once.
8. **Examine.** Run `examine` once, then `history`. Optionally run `examine` again: it should return `existing`, consume one more event and create no second run.
9. **Revoke.** Run `revoke_grant.sql`.
10. **Evidence.** Collect `status`, then gather read-only counts of events and runs. Compare the Storage logs for this one object path with the event count: the budget limits the examination adapter, not Storage in general.

## Target safeguards

These are layered operator safeguards, **not** authentication of the database's identity.

- **Configured URL versus expected ref.** The configured Supabase URL must name the ref the operator expects.
- **The live app's URL.** The live Production app's own embedded Supabase URL must equal the target for Production, and must differ for staging.
- **The key's ref claim**, when the service key carries one. Newer key formats don't, and the script then reports this layer as unavailable.
- **The single-use code.** Only the database where the grant was created can answer the status function with it.
- **The Production assessment row** (`ASSESS-005`) in `create_grant.sql`. This is supporting evidence only.

## If a seed fails partway

The `seed` output names the stage:

| Stage | Meaning |
|---|---|
| `refused_before_write` | Nothing was written; the grant is still unbound |
| `insert_outcome_unknown` | The row may or may not exist |
| `pending_without_object` | The row exists, but the file wasn't uploaded |
| `object_unverified` | The file couldn't be read back, or doesn't match the fixture |
| `not_marked_stored` | The file was uploaded, but the row wasn't marked stored |

For every stage after the insert:
- **No automatic cleanup** is attempted, now or later.
- The grant stays bound to that document ID and **can never be re-bound**, even if the pending row is later removed. The database records the binding on the grant itself.
- Revoke the grant, inspect the state with `status`, and decide any cleanup as a separate, governed step.

**Application roles can't remove a seeded row.** `service_role`, `authenticated` and `anon` can never delete an operator-seeded row, or mark it deleted. As a result:
- DOC-1's `cleanupEvidence` routine (for abandoned uploads; not wired to any route or job today) can't silently remove a stale pending seed or its file. It would report a failure instead, and it removes the row before the file, so the file is untouched.
- The DOC-1 delete route can't remove one either.
- Only the database operator can remove a seeded document, as a separate, governed decision. This is an authority rule, not a retention rule.

## What revocation does and doesn't do

Revocation ends examination authorization immediately.

It does **not** delete the grant row, the document, the file, access events or runs. Nothing in this milestone deletes or expires them, and no retention policy is implied either way.
