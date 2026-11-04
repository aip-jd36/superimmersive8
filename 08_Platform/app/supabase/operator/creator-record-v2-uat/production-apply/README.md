# CR-V2-PROD-UAT-D1: Production Migration Execution Pack (20261104000000 → 20261105000000; 20261106000000 prepared)

**Status: APPLIED TO PRODUCTION, 2026-11-03 (operator-reported).** 01 → 04 committed and verified, with all checks passing and no drift. See `08_Platform/implementation/CR_V2_PROD_UAT_D_MIGRATION_RECORD.md`. Do not run 01 or 03 again: their pre-checks refuse anyway. The verification queries (02, 04) remain safe to run at any time.

This pack applies the two committed migrations to Production, each in one bounded transaction, and proves the result. It creates **no** grant, marker, user, document or run, and it changes no Production stop.

## 20261107000000: permanent admin-only UAT

`build_20261107.js` generates three files from the committed migration: `08_apply_20261107.sql` (one transaction), `09_verify_20261107.sql` (read-only) and `../rollback_20261107.sql`.

1. Confirm the project ref in the dashboard URL. A database can't prove its own ref, so this stays an operator step.
2. Run `09_verify_20261107.sql`. Before applying, `state` must be `absent`.
3. Run `08_apply_20261107.sql`. Success is one row: `result = '20261107000000 COMMITTED'`.
4. Run `09_verify_20261107.sql`. `state` must be `applied`, `all_pass` true and `failed` empty.
5. On an error or unclear response: run `ROLLBACK;` alone, then `09_verify_20261107.sql`, and read its `state` first.

**What 08 refuses, before any change:** no Cloud World assessment or a staging placeholder; the exact CR-V2-UAT-PROD-9 run, grant and project ref not found; any state but `absent`; an active grant; the marker. Its post-check refuses, and commits nothing, unless the function bodies and run constraint match the digests pinned in `expected.json`.

**States:** `absent` (not applied), `applied`, `disabled` (rolled back after an admin run existed), `partial` (stop and report).

Rollback restores the 20261106 functions, so admin reads and new runs are refused. It restores the old run CHECK only if no admin run exists; otherwise the CHECK stays, because that history is append-only.

If `20261107000000` ever changes, its new digests must be pinned in `expected.json`, or the build refuses.

## Files

| File | Kind | What it does |
|---|---|---|
| `01_apply_20261104.sql` | Write, **one transaction** | Pre-check → migration `20261104000000` verbatim → post-check (= `02`) → `NOTIFY pgrst` → `COMMIT` |
| `02_verify_20261104.sql` | Read-only, one `SELECT` | `state` (`absent` / `applied` / `partial`), `all_pass`, `failed[]` for 31 checks, and `drift` (diagnostic) |
| `03_apply_20261105.sql` | Write, **one transaction** | Pre-check (02 must pass, 04 must be `absent`) → migration `20261105000000` verbatim → post-check (= `04`) → `NOTIFY pgrst` → `COMMIT` |
| `04_verify_20261105.sql` | Read-only, one `SELECT` | The same shape, with 28 checks |
| `expected.json` | Data | The exact definitions of the columns, constraints and indexes the two migrations own, as a count and an MD5. Captured from the committed migrations on PostgreSQL 15.19 and 17.4 (identical), plus the names expected on the protected tables. |
| `build.js` | Generator | Generates 02 and 04 from `expected.json` and its fixed rules, then 01 and 03 from the committed migrations and 02/04. `node build.js --check` must print `pack files are current`. |

**Don't edit any of the four `.sql` files by hand.** `__tests__/ops/cr-v2-production-apply-sql.test.ts` fails unless each equals `build.js` output exactly.

**Migration semantics are unchanged.** The migration text inside each apply file is byte-identical to the committed migration (checked by that same test).

## Transaction boundaries and timeouts

Each apply file is exactly: `BEGIN` → the four limits below → pre-check `DO` → migration → post-check `DO` → `NOTIFY pgrst, 'reload schema'` → `COMMIT` → `SELECT '<migration> COMMITTED'`.

| Setting | Value | Why |
|---|---|---|
| `lock_timeout` | `5s` | Never queue behind a long transaction. A queued `ALTER TABLE` would also block everything behind it. 20261104 briefly locks `public.users` against writes (new foreign keys); both migrations take exclusive locks on DOC-1 tables. |
| `statement_timeout` | `120s` | No single statement may run long. Locally each file takes under 40 ms. |
| `idle_in_transaction_session_timeout` | `60s` | A transaction left **open and idle without an error** (for example, if a client sent the statements separately and stopped) is ended by the server within a minute, and its locks are released. |
| `transaction_timeout` (PostgreSQL 17+) | `180s` | Bounds the whole transaction, **even while it is busy**. When exceeded, the server ends the session (`25P04`) and releases its locks. Set only when `server_version_num >= 170000`, because the setting doesn't exist before 17. Production is 17.6. |

**What happens on an error (measured on PostgreSQL 15.19 and 17.4):**
- **Locks are released at the error.** Any error aborts the transaction, and PostgreSQL releases every lock it holds immediately. An aborted session holds **no** locks.
- **An aborted session needs an explicit `ROLLBACK`.** It refuses every statement (`25P02`) until `ROLLBACK` is run, which is why the operator always runs `ROLLBACK;` after an error.
- **The idle timeout doesn't apply to an aborted session.** The abort also reverts the `SET LOCAL` values, so it no longer has that timeout. That's harmless, because it holds no locks.
- **An open, idle transaction** (one that has had no error) **is ended by `idle_in_transaction_session_timeout`.** Tested with a held `ACCESS EXCLUSIVE` lock: the session was terminated and the lock released.
- **On PostgreSQL 17, a long busy transaction is ended by `transaction_timeout`** (`25P04`), and its locks are released.

**Pre-checks (each refuses before any change):**
- **Identity corroboration:** `ASSESS-005-2026-07-12` exists and is not the staging placeholder.
  - This is supporting evidence only; the Dashboard establishes identity.
  - It does **not** test `is_system_test`, which is `true` in Production.
- **01:** `02` must report `absent`, every `doc1_*` check in it must pass (the DOC-1 privileges, RLS, policies, triggers, functions and bodies exactly as verified in Production), and `04` must report `absent`.
- **03:** `02` must report `applied` with `all_pass`, and `04` must report `absent`.
  - 20261105's own preconditions then also run: historical consent consistency, and the exact DOC-2C-B run constraints.

**Post-checks:** 02 or 04, embedded verbatim. If anything fails, the post-check raises an exception, so `COMMIT` is never reached.

## Exact operator sequence (after separate approval)

Use the **verified Production SQL Editor** (C1 Step 0: SI8 org, the ref `lehqgcgnenwdmuzudbrs` in the page address, the editor opened from that project's own sidebar).

**Run one file per Run.** Copy each file from disk, never from a chat window:

`Get-Content -Raw -Encoding UTF8 "<file>" | Set-Clipboard`

| Step | Run | Proceed only if |
|---|---|---|
| 0 | `02_verify_20261104.sql`, then `04_verify_20261105.sql` | both report `state: "absent"` |
| 1 | `01_apply_20261104.sql` | exactly one row: `d1a_result = '20261104000000 COMMITTED'` |
| 2 | `02_verify_20261104.sql` | `state: "applied"`, `all_pass: true`, `failed: []`, `checks: 31`; `drift` reviewed (see below) |
| 3 | `03_apply_20261105.sql` | exactly one row: `d1b_result = '20261105000000 COMMITTED'` |
| 4 | `04_verify_20261105.sql` | `state: "applied"`, `all_pass: true`, `failed: []`, `checks: 28`; `drift` reviewed |
| 5 | `02_verify_20261104.sql` again | still `applied` and `all_pass: true` |
| 6 | `NOTIFY pgrst, 'reload schema';` | Belt and braces (see "Schema cache"). Harmless. |
| 7 | the preflight pack's U1 (`supabase/verification/cr-v2-uat-preflight/u1_object_presence.sql`) | every value `true` |

**After a destructive-operation warning:** the Supabase SQL Editor may show one for 01 or 03, because the migrations contain `DROP TRIGGER IF EXISTS` and `DROP CONSTRAINT IF EXISTS`. Confirm only for these two files.

**Don't continue past any step whose condition isn't met.** Return each result cell, never a screenshot.

## Failure handling: how to tell committed from not committed

**The Dashboard's response is not the authority. The verification query is.**

1. **01 or 03 shows an error, times out, or the browser or network fails:**
   - **Run `ROLLBACK;` on its own.** An aborted session already holds no locks (they are released at the error), but it refuses every statement (`25P02`) until `ROLLBACK`. If nothing is open, `ROLLBACK` only warns, which is harmless. If the transaction is somehow still open without an error, `ROLLBACK` ends it; otherwise the idle timeout does so within a minute.
   - **Then run the matching verification query on its own** (02 after 01, 04 after 03), and read its `state`:
     - **`absent`:** nothing was committed, and there's nothing to undo. Record the error text. Retry only after its cause is understood. A `55P03` lock timeout is safe to retry later, at a quieter moment.
     - **`applied`** (and `all_pass: true`): the `COMMIT` did happen, and only the response was lost. Continue with the next step. **Don't re-run the apply file** (its pre-check would refuse anyway).
     - **`partial`:** should be impossible, because every apply is one transaction. **STOP. Change nothing, and report.**
2. **A refusal message** (`D1A refused: …`, `D1B refused: …`, `… post-check failed; nothing is committed: …`, or the migration's own `historical document provenance cannot be established`): nothing was committed. Run `ROLLBACK;`, keep the message, and stop. The message names the failing check or state.
   - **Never "fix" data, privileges or objects to make a check pass.** That needs its own decision.
3. **An unexpected result from 02 or 04** (any `failed` entry while `applied`): **STOP and report.**
4. **A non-empty `drift`** (with `all_pass: true`): **not** a failure. Report the listed names for review before continuing. See "What the verification checks".

**Tested locally (PostgreSQL 15.19 and 17.4):**
- each refusal;
- a tampered post-check;
- a lock held by another session (`55P03` after about 5 s);
- a DOC-1 boundary deviation already present (refused by the 01 pre-check);
- a historical document without the intake consent.

Every one of these left `state: "absent"` (or the previous step's state) and committed nothing.

## What the verification checks (02 and 04)

Bounded to these two migrations, not a schema freeze. Each check is either a **failure** (`all_pass: false`, STOP) or **drift** (reported, never a failure).

**Fails: security and migration integrity, exact, on the protected objects.**
- **Protected tables:** DOC-1's documents, access log and prepared documents; 20261104's marker, fixtures and runs; 20261105's grants.
- **Protected functions:** the three DOC-1 functions and every function either migration creates or replaces.
- **On the protected tables, exactly as expected:**
  - every table privilege (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`, and `MAINTAIN` on 17) for `anon`, `authenticated`, `PUBLIC` and `service_role`;
  - RLS on;
  - no policies;
  - the exact set of triggers, each enabled.
- **On the protected functions:**
  - security mode (definer or invoker) and settings (`search_path`);
  - owner;
  - exactly who may `EXECUTE`;
  - the DOC-1 function bodies.
- **Migration-owned columns, constraints and indexes:** each named item exists with exactly its committed definition (`expected.json`).
- **Data:** no marker, grant or run; 45 fixtures; DOC-1 rows unchanged in meaning.

**Reported as `drift` (never a failure by itself):**
- tables or functions under the `creator_record_v2` prefix that neither migration expects;
- extra columns, constraints or indexes on the protected tables.

These can't weaken the migrations' security: an extra trigger, policy, privilege or disabled control is a failure, not drift. An extra constraint can only refuse more.

**The 16 deviation cases from D1B, plus 7 more, are a committed test** (`__tests__/db/creator-record-v2-production-apply.db.test.ts`). Each is checked after both migrations, on PostgreSQL 15 and 17.

## Schema cache (PostgREST)

- **The reload request is inside the transaction.** Each apply file issues `NOTIFY pgrst, 'reload schema'` before `COMMIT`. PostgreSQL delivers a notification only if the transaction commits (tested: a failed apply delivered none, and a successful one delivered exactly one). Supabase's own DDL event trigger usually reloads the cache as well.
- **The reload is not verification.** Success of the migration is established only by 02 and 04.
- **Step 6 repeats the reload.** It's harmless, and covers a listener that missed the first one.
- **Whether the API actually sees the new objects isn't tested here.** PostgREST exposure of the status and write functions to `service_role` is first exercised by the UAT script's `status` command, under the separately approved UAT. Until then, nothing calls these functions.

## Rollback and recovery (documented only; nothing here runs rollback SQL)

| Situation | What is possible |
|---|---|
| **01 or 03 didn't commit** (`absent`) | Nothing to undo. |
| **After 01, before 03, no examination activity** | 20261104 can be undone: drop its objects and the `purpose` column. That's allowed only while no run and no examination-purpose read exists, and in Production both are impossible, because the marker can never name the Production ref. The exact statements are exercised by `__tests__/db/creator-record-v2-examination.db.test.ts`. Needs its own approval. |
| **After 03, before any grant exists** | `supabase/operator/creator-record-v2-uat/rollback_20261105.sql` (refuses once any grant row exists), then re-apply `20261104000000` verbatim. Exercised by the operator UAT DB test. Needs its own approval. |
| **After the first grant is created** | **Irreversible by design.** Grants, documents, access events and runs are never deleted (no retention policy exists). Rolling back 20261105 is refused. The only lever is revocation (`revoke_grant.sql`): with no active grant and no marker, every examination read and run is refused. Any further change is forward-only and needs its own decision. |
| **Never** | Re-apply `20261104000000` after `20261105000000`: it would restore the grant-unaware functions (fail-closed, but it breaks the grant path). Run `supabase db push` against Production: no migration here is recorded in the CLI history, so it would try to re-run the whole history. |

**Production code is unaffected either way.** The application deployed when the migrations were applied (`08f5190d`) has no route or job that calls any object these migrations create. DOC-1 intake, downloads and owner deletion keep their exact behaviour (tested), so applying them, or not, changes no live behaviour.

## PostgreSQL 17.6 and managed Supabase

- **Tested on PostgreSQL 17.4** (all 9 DB suites; the only differences were the suites' own "server is 15" assertions) and **15.19** (CI's version).
- **Tested as a Supabase-shaped non-superuser owner** (`NOSUPERUSER CREATEROLE CREATEDB BYPASSRLS`): both apply files commit, and all checks pass.
  - Every new object is owned by the applying role, which is the owner of the DOC-1 tables. 02 and 04 check this, because the security-definer functions depend on it.
- **Supabase's default privileges are revoked.** Supabase grants new `public` tables and functions to `anon`, `authenticated` and `service_role` by default (simulated by `__tests__/db/bootstrap.sql`). Both migrations revoke these explicitly, and 02 and 04 verify that the only API privileges are `service_role` reading fixtures and runs, and `service_role` executing the write and status functions.
- **Locking:**
  - The `ADD COLUMN … DEFAULT <constant>` changes are catalog-only on PostgreSQL 11+.
  - The new checks and index scan the DOC-1 tables, which are empty in Production (C1: zero documents and zero access events).
  - Exclusive locks on DOC-1 tables, and a write-blocking lock on `public.users`, are held until `COMMIT`. That is milliseconds when there is no contention, and at most `lock_timeout` when there is.
- **Line endings.** Production's DOC-1 function bodies are stored with CRLF line endings, because they were pasted from Windows. The fingerprint checks accept exactly the LF or the CRLF form of the committed body.

## 20261106000000 (CR-V2-EXAM-INTEGRATION-X1): 05 and 06, after E4

**Not authorized to run.** Applying 20261106 to Production needs its own PM decision. These two files are prepared and tested only.

| File | What it does |
|---|---|
| `05_apply_20261106.sql` | One transaction, the same bounded timeouts as 01 and 03. Pre-check, then the migration verbatim, then the post-check, then `NOTIFY pgrst`, then `COMMIT`. Success is exactly one row: `x1p_result = '20261106000000 COMMITTED'`. |
| `06_verify_20261106.sql` | Read-only: `state` (`absent`, `applied` or `partial`), 18 checks and drift. It is the authority on whether 05 committed. Its checks are invariants, so they keep passing after customer-path grants exist. |

**Why the pre-check doesn't require 02 and 04 to pass in full.** Production already holds the E4 operator-UAT history: one revoked operator grant, its seeded document, two examination reads and one run. 02 and 04 were written for a pre-UAT database, so on E4 they fail exactly these data counts:

- 02: `access_log_all_downloads`, `runs_rows_0`;
- 04: `access_log_no_grant_rows`, `documents_all_owner_upload`, `grants_rows_0`.

The pre-check allows exactly those failures and nothing else. Any security, shape or other deviation still refuses. This set was established on a Production-shaped database (`__tests__/db/creator-record-v2-production-apply-20261106.db.test.ts`), not assumed.

**The named allowance is not enough on its own.** Those checks only test "count is zero", so they fail identically for one row or many. 05 therefore also pins the **exact E4 history** (`expected.json` → `e4_20261106`), taken from the committed E4 record `08_Platform/implementation/CR_V2_PROD_UAT_E4_EXAMINATION_RECORD.md` and its `e1_state` reconciliation:

- **the one run:** id `5a2f9a72-…`, its examination key, that document, identity and grant, `operator_synthetic_uat` on the Production ref, the Kling fixture, outcome `examined`, no supersession;
- **the one document:** id `daa1f62d-…`, that identity and fixture SHA-256, seeded under that grant, no consent value, `stored`;
- **the one examination access event:** for that document, identity and grant, and it is that run's event. It is also the only event that carries any grant;
- **the one grant:** id `27d8c027-…`, that identity, fixture, bound document and Production ref; the recorded created and expiry times; 4 reads and 1 run; revoked.

Anything more, less or different refuses before any change, naming the first differing category (runs, then documents, then examination events, then grants). The post-check repeats the fingerprint, with the one expected schema difference: the grant then reads `operator_seed`.

**Deliberately not checked, because the E4 record does not establish them:**

- the access event's id;
- `file_download` rows (`e1_state` counts examination events only);
- the revocation time, and the stored `revoked_by` / `revoke_reason` text (operator-entered, never read back);
- the run's envelope digest and created time;
- the grant's `established_by` / `reason` / `change_ref`.

**This makes 05 specific to Production's exact current state.** Any other database, including staging, would need its own decision.

**The 05 pre-check refuses, before any change, unless all of these hold:**

- the database looks like Production (the same Cloud World check as 01 and 03);
- 06 is `absent` (so a second run is named as such);
- 02 and 04 are `applied`, failing only the E4 data counts above;
- the history is exactly E4 (the fingerprint above);
- no grant of any kind is active;
- no isolated-test marker exists.

The migration's own precondition (the exact 20261105 run authority constraint) follows.

**The 05 post-check refuses, so nothing commits, unless all of these hold:**

- 06 is `applied` and every check passes;
- 02 still fails only the E4 data counts;
- 04 fails only the E4 data counts plus `shape_runs_constraints`. That is the run authority constraint 20261106 replaces by design, so expect it in 04's output from then on;
- every E4 row still matches the fingerprint, and the grant reads `operator_seed`.

**What 06 checks:**

- the exact definitions of every grant column (including `grant_kind`), every grant constraint (including the kind CHECK), the grant indexes, and the run columns and constraints;
- the five replaced function bodies, accepting the LF form (as embedded in 05) or the CRLF form, one per function;
- the status function's result type;
- two data invariants: a run's boundary agrees with its grant's kind, and a customer-path grant binds only its identity's own upload of the granted bytes;
- every protected table's privileges, RLS, policies, triggers and owners, and every protected function's mode, owner and EXECUTE grants (all unchanged by 20261106).

**Read-only preflight (`07_preflight_20261106.sql`, CR-V2-UAT-PROD-3).** 02, 04 and 06 cannot tell the E4 history from a larger history: their data checks only test "count is zero". `07` is the standalone, read-only form of the checks 05 makes itself: server version, Production identity, the exact E4 fingerprint, no active grant, no marker, and the exact 20261105 run authority constraint. It also returns diagnostic counts.

- It is hand-maintained. `__tests__/ops/cr-v2-preflight-20261106-sync.test.ts` requires each of its conditions to be the exact positive form of 05's, so a changed value in either file fails the build.
- `__tests__/db/creator-record-v2-production-apply-20261106.db.test.ts` runs 04, 02, 06 and 07 inside `BEGIN READ ONLY` on the exact E4 state and on deviations.

**Preflight order and expected results.** Run each query on its own, in the SQL Editor of the verified Production project:

| Step | File | Expected |
|---|---|---|
| P1 | `04_verify_20261105.sql` | `state` `applied`, `checks` 28, `failed` exactly `["access_log_no_grant_rows","documents_all_owner_upload","grants_rows_0"]`, all drift lists empty |
| P2 | `02_verify_20261104.sql` | `state` `applied`, `checks` 31, `failed` exactly `["access_log_all_downloads","runs_rows_0"]`, all drift lists empty |
| P3 | `06_verify_20261106.sql` | `state` `absent` (its other fields are not evaluated in this state) |
| P4 | `07_preflight_20261106.sql` | every boolean `true`; `counts` exactly grants 1, documents 1, examination_events 1, events_with_grant 1, runs 1, marker_rows 0 |

**GO only if all four match exactly**, immediately before running 05. Then:

- an extra failed name, `partial`, any `false`, any other count, or non-empty drift is **NO-GO**: report it;
- never edit 05, 07 or `expected.json` to make a result pass.

**Operator sequence (only after approval):**

1. Run the preflight P1–P4 above (04, 02, 06, then 07). Every result must match exactly.
2. Confirm no grant is active (P4 `no_active_grant: true`).
3. Run 05.
4. Run 06 and expect `applied`, `all_pass: true` and no drift.
5. Run 02 and 04 and expect the failure sets above.

On any error or unclear response: run `ROLLBACK;` on its own, then run 06. Its `state` decides what happened.

**Rollback limits:**

- **Allowed** only while no `customer_path_uat` grant has ever existed. In ONE transaction, run `supabase/operator/creator-record-v2-uat/rollback_20261106.sql`, then `20261105000000` verbatim. This restores the exact pre-05 state with every E4 row intact (tested). It needs its own approval.
- **Refused** once a customer-path grant exists. Revoke it instead; history is never dropped.
- **Never** re-apply 20261105 on its own after 20261106. It is refused (the status function's return type differs), so it fails closed, but don't rely on that.

**Application compatibility.** The X1 code on `main` (`5d893573`) does not depend on 20261106: nothing deployed reads `grant_kind` or the status function. The X2 creator examination route is stopped by the submissions constant. Even when open, without 20261106 and a customer-path grant the database refuses every read. So the order of deploy and apply doesn't matter for live behaviour.

**Tested on PostgreSQL 15.19 and 17.4.** The expectations captured from the committed migration are identical on both.
