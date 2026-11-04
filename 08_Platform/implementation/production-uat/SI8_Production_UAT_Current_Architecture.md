# SI8 Production UAT: Current Architecture

**Status:** a point-in-time record of the system **before** the simplification: 2026-11-04, `origin/main` = `61c716ec`. Kept as history. For the current process, see the Operational Runbook.

## 1. Why the temporary system exists

It was built to solve a real problem, not out of excess caution.

The repository is public, so anyone can produce SI8's synthetic fixture bytes. Recognising a fixture therefore proves nothing about who uploaded it (`project-synthetic-authority-gap`, `examination/envelope.ts`). Examination needed an authority that didn't depend on file content. At the time:
- Production's governance bundle was empty, and still is.
- No staging environment existed, and none does now.
- The product had no statement of who may test.

So authority was built from a **dedicated non-admin identity plus a short window**. Non-admin was a deliberate choice: a test identity with no privileges limits the damage if it leaks. Each constraint made sense alone. Together they cost a SQL session, a binding code, a code commit and a revert for every UAT.

## 2. Access paths today

| Path | Who | State now | Persists data | Authority |
|---|---|---|---|---|
| `/creator-record` + `/api/creator-record-v2/*` | Signed-in creators | Refuses everyone: submissions `stopped`, window `null` | Yes | Session, submissions stop, pilot invitation |
| `/admin/creator-record-v2` + `/api/admin/creator-record-v2/*` | `is_admin` | **Live** | No (documents examined and discarded) | `requireAdmin()` plus a per-route admin check |
| `/uat/creator-record-v2` + `/api/uat/creator-record-v2/draft` | **Anyone, no login** | **Live: HTTP 200 on 2026-11-04**; closes itself 2026-11-10 07:00 UTC | No (no upload, no database) | Time window only, 9 allowlisted fixtures |
| Operator script `scripts/creator-record-v2-uat/examination-uat.ts` | Service-key holder | Inert without a grant | Yes | Database grant plus binding code |

**The key gap:** the admin prototype can't reach the persisted journey, so it can't produce a version, a run or a v6 record. That's why customer-path UAT needed a special identity.

## 3. Mechanisms, classified

| Mechanism | Where | Class | Keep? |
|---|---|---|---|
| Supabase session, `getUser()` | `lib/supabase/server`, `sessionUserId` | **A** Security | Keep |
| `users.is_admin`, `requireAdmin`, `isAdminUser`, `checkReviewerContextAccess` | `lib/auth/admin`, routes | **A** Security | Keep, **see §6** |
| RLS on, no policies, service role only, on all `creator_record_v2_*` tables | Migrations 20261101–06 | **A** Security | Keep |
| Private `creator-record-evidence` bucket | 20261103 | **A** Security | Keep |
| `CREATOR_RECORD_V2_SUBMISSIONS`, `_ISSUANCE` = `stopped` | Code constants | **A** Commercial lock | Keep |
| `EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED` = false; `LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD` | Code constants | **A** Commercial lock | Keep |
| Purchase gates, governance eligibility, v5-only issuance support | `purchase.ts`, `eligibility.ts`, `governance-state.ts` | **A** Payment protection | Keep |
| `creator_record_v2_pilot_access`, `hasPilotAccess` | 20261101 | **B** Customer pilot | Keep for customers |
| `invite_pilot_user.sql` | Operator | **B** Customer pilot (no UI exists) | Keep |
| Prepared-version immutability, digests, append-only guards | 20261101, 20261103, 20261104 | **C** Evidence integrity | Keep |
| Evidence access log, audit before any read | 20261103+ | **C** Evidence integrity | Keep |
| Examination write function: envelope validation, recomputed key, fixture recognition | `creator_record_v2_record_examination` | **C** Evidence integrity | Keep |
| `execution_boundary`, `not_verified`, `workflow_authorization = not_established` | 20261104+ | **C** Evidence integrity | Keep |
| Synthetic authority stamped into records, `syntheticClosed` | `service.ts`, `synthetic-uat.ts` | **C** Separation | Keep |
| Isolated-test environment marker | 20261104 | **C** Refuses the Production ref by CHECK | Keep; unused in Production |
| `CREATOR_RECORD_V2_SYNTHETIC_UAT` window, `syntheticUatWindowOpen`, 12 h cap | `synthetic-uat.ts` | **D** Temporary | Remove (Phase 5) |
| `examination_uat_grants`: binding nonce, 2 h limit, 4 reads, 1 run, single active grant, grant kinds | 20261105, 20261106 | **D** Temporary | Stop using; **table stays** (history) |
| `create_grant.sql`, `create_customer_path_grant.sql`, `revoke_grant.sql`, `remove_pilot_user.sql` | `supabase/operator/creator-record-v2-uat` | **D** Temporary | Archive |
| `examination-uat.ts` script, `lib/creator-record-flow/examination-uat.ts`, binding-code files | Scripts, operator packs | **D** Temporary | Remove |
| Account bans | Supabase dashboard | **D** Temporary | Stop |
| Q1–Q5 closure queries | Scratch only | **D** Temporary | Not needed for routine UAT |
| Public harness | `lib/creator-record/public-uat/*`, `app/uat/*` | **D** Temporary | Let it expire, then remove |

## 4. Payment and notification protection

- **Customer purchase** needs issuance enabled, submissions open, an invitation, a reviewed latest version, intact evidence and runs, and governance eligibility, before any Stripe call.
- **Synthetic versions** can't pass eligibility: their authority isn't in the governance bundle, and v6 isn't an issuable schema.
- **Notifications:** a search found no email or Resend import under `lib/creator-record`, `lib/creator-record-flow`, `app/api/creator-record-v2` or `app/creator-record`. Nothing in the prepare, examine or review path sends mail.
- **Analytics:** GA is suppressed only on `/uat` paths, so `/admin` page views are recorded.

## 5. Test and release signals

- **No CI runs the Jest suite.** The only test workflow is `payment-ledger-db-tests.yml`. Commit statuses come from Vercel, and a push to `main` deploys all three projects.
- **The full suite isn't green:** 89 tests fail, before and after recent changes. A green suite isn't available as a release signal today.
- **Production migrations are applied by hand** in the SQL Editor; there's no CLI link.

## 6. Finding: `is_admin` may be self-writable

**Severity: critical if confirmed. Not confirmed in Production.**

`supabase/migrations/001_initial_schema.sql:211`:

```sql
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);
```

There's no `WITH CHECK` and no column restriction. No later migration in either folder drops it, and the only committed trigger on `users` sets `updated_at`. `is_admin` is a column on that row, and `submissions` has an equivalent self-update policy.

| Evidence | What it shows |
|---|---|
| The committed policy | Definite in the repository |
| Local test: committed policy text, Supabase default grants | A signed-in user set their own `is_admin` to true |
| Same test after `REVOKE UPDATE` | Refused; server-side updates still worked |
| App code | No session-client writes to `users` found; a revoke should not affect the app |
| `expected/post-m3` snapshot showing `authenticated:UPDATE` | **Not Production evidence:** its README says it was rebuilt on a stub |
| `__tests__/db/bootstrap.sql:60`, "Production: anon/authenticated have no direct grants" | **A comment, contradicting the snapshot; also unverified** |

**Resolved:** the operator ran Q6 on Production and reported the checked `is_admin` and `submissions` privileges SAFE, so no revoke migration was needed. The rest of this section is the analysis as written before that result.

**What decides it:** the Production table grants. If `authenticated` holds UPDATE there, anyone could sign up on the public page and make themselves an admin using the public API key. If not, the policy is dead code. `Q6_is_admin_exposure.sql` in this folder answers this read-only. It wasn't tested by attempting anything against Production.

Evidence on `submissions` needs the same check, because `status` and `payment_status` live there.

## 7. The test identity

`jdchangmedia+crv2uat@gmail.com` (`3adfe2e0-…`):

| Question | Answer | Source |
|---|---|---|
| Still needed? | No | Window closed, grant revoked |
| Privileges beyond ordinary sign-in? | No: `is_admin` was false in Q1, invitation rows 0 | Operator-reported Q1, Q5 |
| All grants revoked? | Yes, 07:49 UTC, and revocation is final | Q5 |
| Creator Record access? | Refused: submissions stopped, no window | Code |
| Anything it can still do? | Sign in; view an empty dashboard; download its own synthetic fixture (owner access, logged) | `evidence/[id]/file` route |
| Ban value? | **Negligible:** see the proposal, §5 | Reasoning |
| Can it be deleted? | No: `creator_record_v2_prepared.user_id` is `ON DELETE RESTRICT`, and history must stay | 20261101 |

Its ban state is unknown to the author: Q5 showed `null`, and no later result was seen.
