# CR-V2-PROD-UAT-E4 — Production synthetic examination UAT record

**Status: PASS — VERIFIED AND CLOSED, 2026-11-03** (operator-reported; PM decision: GO for closure after the final read-only Production reconciliation below).

This record holds what the operator reported from their own shell (the CLI `scripts/creator-record-v2-uat/examination-uat.ts`) and from the Production Supabase SQL Editor.
- It is **operator-reported**. No SQL Editor logs, screenshots or terminal transcripts are stored here.
- No connection to Production was made from the engineering environment.
- Nothing below is an independent observation unless it says so.

## What was run

| Item | Value |
|---|---|
| Project | Production, `lehqgcgnenwdmuzudbrs` |
| Source | `origin/main` = `887d6d28`. Runbook: `08_Platform/app/supabase/operator/creator-record-v2-uat/README.md`, steps 4–10 |
| Synthetic identity | `45f0d04f-4082-42ba-b65e-d8e28a3fc8bf`: dedicated, not an admin, no pilot invitation and no submission (Q9). Banned at the Auth layer until 2026-11-10 15:59 |
| Fixture | `pdf-kling-pro-monthly`, SHA-256 `4db805768f966b748098e3890d9a8c4a76ed12e46609aaeccb8902733563501c` |
| Grant code | Freshly generated and kept private. The code disclosed during E2 was not used. |

## Operator-reported results

| Runbook step | Reported result |
|---|---|
| 5. Grant (`create_grant.sql`) | Grant `27d8c027-44d0-4c4a-91fb-fa8ba5518848`, created `2026-11-03T08:50:18.968754Z`, expires `2026-11-03T10:50:18.968754Z` (the 120-minute maximum) |
| 6. Status before seeding | Directly verified by the operator: all target checks passed; the grant was active, unrevoked and unbound, with 0 reads and 0 runs used. (`seed` also refuses before any write unless the grant is active and unbound.) |
| 7. Seed | `outcome.stage = stored`, document `daa1f62d-1655-46cd-906b-7d44817d1f88`. The fixture ID and SHA-256 matched the grant. A later `status` showed the grant bound to this document. |
| 8. Examine (once) | `kind = recorded`, `result = created`, `outcome = {status: examined, reason: null}`, run `5a2f9a72-1ae5-4db0-9d27-7dbee34ff697`, examination key `d1e75f5c11bac55f5be45271188d733aca815370af6312ad64928e78bac6fcf5` |
| 8. History | `kind = verified`, exactly one run. The run ID and key matched the examination, with `supersedes_id = null` and outcome `examined`. |
| 8. Optional second examine | Not performed (not required) |
| 9. Revoke (`revoke_grant.sql`) | `revoked_by = SI8 operator`, `revoke_reason = CR-V2-PROD-UAT-E4 completed: synthetic examination and persisted history verified`. The editor showed `Success. No rows returned`; the `revoked N grant(s)` notice was not reported, and neither was the revocation time. |
| 10. Final `status` (after revocation) | 4/4 target checks passed; `active = false`, `revoked = true`, `bound_document_id = daa1f62d-…`, `read_events_used = 1` of 4, `new_runs_used = 1` of 1 |

**Budgets.** The status function counts access events and runs that carry this grant's ID. So 1 of 4 reads and 1 of 1 new runs were used, within budget. The run budget is now exhausted, so this grant could never create a second run, even before it was revoked.

## What this establishes, and what it does not

**Established for this one grant, from the operator-reported output.** The real Production path, through PostgREST, supabase-js and Storage, did the following:
- served the status function to `service_role`;
- accepted the approved fixture;
- stored the document, read it back and bound it to the grant;
- recorded one examination with outcome `examined`, against one examination access event;
- returned that run as verified history;
- accepted the revocation.

None of this had been exercised against real Supabase before E4 (see the D record).

**Established for the whole database,** by the final read-only reconciliation: this grant is the only grant that has ever existed, and none is active. Exactly one document, one examination access event and one run exist, and no isolated-test marker exists.

**Not established:**
- readiness for real documents, live extraction, customer onboarding, payment, PDF issuance, production-scale reliability, or commercial assurance;
- **Storage access to the object** beyond the adapter: runbook step 10's optional Storage-log comparison was **not performed**;
- **that the operator's temporary credentials were cleared** from their shell. No confirmation was given.

The application's stops are unchanged: submissions and issuance `stopped`, real documents and live extraction `false`.

## Permanent consequences (by design)

- **Rollback is gone:** `rollback_20261105.sql` now refuses permanently, because a grant has existed. 20261104 and 20261105 are irreversible.
- **The grant row is permanent:** grants are never deleted, and revocation is final.
- **The identity can't be deleted:** `45f0d04f-…` is referenced by the grant (FK RESTRICT) and by the seeded document.
- **The seeded document and its Storage object stay.** Application roles (`service_role`, `authenticated`, `anon`) can't delete the row or mark it deleted; only the database operator can, as a separate, governed decision.
- **The record is append-only:** the examination access event and the run can't be removed. This is an authority rule, not a retention policy; none is implied.

## Final read-only Production reconciliation (runbook step 10)

The operator ran `e1_state.sql` (from the CR-V2-PROD-UAT-E1 operator pack, unchanged) in the Production SQL Editor after revocation. It's a single read-only `SELECT`. Result:

```json
{"marker_rows":0,"grants_total":1,"grants_active":0,"grants_bound":1,"seeded_documents":1,"documents_total":1,"examination_access_events":1,"runs_total":1,"fixtures_total":45,"fixture_pdf_kling_pro_monthly":true,"status_function_unknown_code_rows":0,"protected_function_bodies_match":11,"protected_function_bodies_expected":11,"auth_users_total":8,"auth_users_banned":1}
```

Every value matches the expected post-E4 state:
- **One grant, ever:** 1 grant, bound and not active.
- **One trail:** 1 seeded document (which is also the only document), 1 examination access event and 1 run.
- **No marker.**
- **Fixtures unchanged:** 45 fixtures, the Kling fixture present.
- **Status function closed:** it returns no rows for an unknown code.
- **Function bodies match:** all 11 protected bodies match the committed migrations.
- **Auth counts unchanged** since E3.

**Closure decision:** PM GO, 2026-11-03. E4 is verified and closed.

## Remaining notes (not blocking)

- **Ban expiry.** The Auth ban on the identity ends on 2026-11-10 at 15:59. No grant can use the identity again without a new approval. Whether to extend the ban is a separate operator decision.
- **Storage-log comparison: not performed** (optional). If ever done, expect one upload and two reads for the object: the seed's read-back, then the examination.
- **Operator credentials:** clearing of the temporary shell credentials has not been confirmed.
- **Further UAT:** any further grant needs a new approval and a new code.
