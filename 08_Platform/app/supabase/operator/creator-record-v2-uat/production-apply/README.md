# CR-V2-PROD-UAT-D1: Production Migration Execution Pack (20261104000000 → 20261105000000)

**Status: prepared and tested locally only. Running any file here against Production needs its own explicit approval.**

This pack applies the two committed migrations to Production, each in one bounded transaction, and proves the result. It creates **no** grant, marker, user, document or run, and it changes no Production stop.

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

**Production code is unaffected either way.** The deployed `fc7bc89b` has no route or job that calls any object these migrations create. DOC-1 intake, downloads and owner deletion keep their exact behaviour (tested), so applying them, or not, changes no live behaviour.

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
