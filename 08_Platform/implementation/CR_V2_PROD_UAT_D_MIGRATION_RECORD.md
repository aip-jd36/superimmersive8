# CR-V2-PROD-UAT-D — Production migration record (20261104000000 + 20261105000000)

**Status: APPLIED AND VERIFIED IN PRODUCTION, 2026-11-03 (operator-reported).**
**Examination UAT: NOT STARTED.** No test identity, grant, seeded document, examination read or run exists because of this milestone.

This record holds what the database operator reported from the Production Supabase SQL Editor. The results are **operator-reported**:
- No SQL Editor logs or screenshots are stored here.
- No session timestamps beyond the date were reported.
- No connection to Production was made from the engineering environment.

It records only what was reported. Nothing below is an independent observation unless it says so.

## What was run

| Item | Value |
|---|---|
| Project | Production, `lehqgcgnenwdmuzudbrs` (identity per the CR-V2-PROD-UAT-C1 Dashboard steps, corroborated by Q1b) |
| Source | `origin/main` = `08f5190d78019696da3a5939480fa9bdc74b62dd`. The pack files are byte-identical to the reviewed `90f19572`. |
| Pack | `08_Platform/app/supabase/operator/creator-record-v2-uat/production-apply/` (see its README) |
| Method | SQL Editor, one file per run, each copied from disk |
| CI for that source | Database tests `41582835769`: 270/270 passed (independently read from the public run page). All three Vercel deployments succeeded. |
| Deployed application at the time | `08f5190d` (Vercel `si8-creator-portal` deployment `AzxgK6bXUi1WCXSkM1TMzHNZvkX3`). No route or job in it calls any object these migrations create. |

## Operator-reported results

| Step | File | Reported result |
|---|---|---|
| Apply 20261104 | `01_apply_20261104.sql` | `20261104000000 COMMITTED` |
| Verify 20261104 | `02_verify_20261104.sql` | `state = applied`, `all_pass = true`, `failed = []`, `checks = 31`; every `drift` category empty |
| Apply 20261105 | `03_apply_20261105.sql` | `20261105000000 COMMITTED` |
| Verify 20261105 | `04_verify_20261105.sql` | `state = applied`, `all_pass = true`, `failed = []`, `checks = 28`; every `drift` category empty |
| Re-verify 20261104 after 20261105 | `02_verify_20261104.sql` | `state = applied`, `all_pass = true`, `failed = []`, `checks = 31`; every `drift` category empty |
| Schema-cache reload | `NOTIFY pgrst, 'reload schema';` | `Success. No rows returned` |
| Object presence | U1 (`supabase/verification/cr-v2-uat-preflight/u1_object_presence.sql`) | all 12 values `true` |

**Step 0 wasn't reported separately.** That's the two verification queries run before the first apply, which must return `absent`. Each apply file's pre-check refuses before any change unless those conditions hold, and each reported `COMMITTED`.

## What this establishes, and what it does not

**Established, by the operator-reported verification:**
- **Both migrations are committed in Production.** Each verification query is a database query, run separately after its apply, and is the authority on committed state.
- **Every security and migration-integrity check passed.** That covers:
  - privileges on the protected tables and functions, for `anon`, `authenticated`, `PUBLIC` and `service_role` (including `TRUNCATE` and `MAINTAIN`);
  - RLS, policies, triggers and their enabled state;
  - `EXECUTE`;
  - function security mode, `search_path` and owner;
  - the DOC-1 function bodies;
  - the migration-owned column, constraint and index definitions.
- **No unexpected objects:** drift was empty.
- **The data checks passed:** no marker, no grant, no run, 45 fixtures, every historical document `owner_upload`, and nothing attributed to a grant.

**Not established:**
- **Whether PostgREST actually reloaded its schema cache.** The `NOTIFY` was accepted; the reload itself wasn't observed.
- **Whether the API exposes the new functions.** That's the status and write functions, to `service_role`.
- **Any real Supabase Storage or PostgREST examination behaviour.** Seeding through supabase-js with an empty consent value, Storage upload and read-back, the status function called through the API, and an examination read and run under a grant have **never been exercised against real Supabase**. Every run of them so far used disposable local PostgreSQL.
- **Anything about the UAT itself.** No grant has ever existed in Production.

## Consequences

- **Rollback window.** 20261105 can be rolled back (`supabase/operator/creator-record-v2-uat/rollback_20261105.sql`, then re-apply 20261104) **only while no grant has ever existed**. That's true today. Creating the first grant makes the migrations irreversible by design.
- **Inert in Production.** The isolated-test marker can never name the Production ref, and no grant exists, so every examination read and run is refused by the database. The application's stops are unchanged: submissions and issuance `stopped`, real documents and live extraction `false`.
- **Never** re-apply 20261104 after 20261105, and never run `supabase db push` against Production. The CLI migration history still records none of these migrations.

## Remaining prerequisites before any examination UAT (each needs its own approval)

1. **Test identity:** a dedicated synthetic identity created, **banned at the Auth layer**, with an address on an SI8-controlled mailbox; then Q9 (`banned_until`, never signed in, email identity only, no invitation, no submission).
2. **Sign-in and recovery refusal tested** for that identity. It's unverified whether Supabase Auth refuses a *recovery* session for a banned user.
3. **API reachability:** PostgREST must serve the status function to `service_role`. The UAT script's `status` command is the first test of this.
4. **Key format:** whether Production's service key carries a `ref` claim (if not, that target check reports itself unavailable).
5. **Role names:** that PostgREST requests run as `service_role`. The no-removal rule matches role names.
6. **Grant creation** with the corrected `create_grant.sql` (identity safeguard fixed in D1). It hasn't been run anywhere except disposable local databases.
7. **Seeding and examination through real supabase-js and Storage,** with the evidence capture defined in the operator runbook (`supabase/operator/creator-record-v2-uat/README.md`).
