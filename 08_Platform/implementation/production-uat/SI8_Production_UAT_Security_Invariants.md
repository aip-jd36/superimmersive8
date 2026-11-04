# SI8 Production UAT: Security Invariants

**Status:** implemented on `work/cr-v2-admin-uat`. "Exists" means an existing test or control covers it; "New" tests are in `__tests__/creator-record/admin-uat.test.ts`, `admin-uat-routes.test.ts` and `__tests__/db/creator-record-v2-admin-uat.db.test.ts`.

**I1 is the exception:** Q6 reported it SAFE on Production, but no automated test covers it, because the test database does not reproduce Production's grants. Re-run Q6 after any change to `public.users` grants or policies.

## Authentication and authorization

| # | Invariant | Enforced by | Test |
|---|---|---|---|
| I1 | A signed-in user can't grant themselves admin | **Unverified: see Q6.** Should be table or column privileges | **New:** catalog check that `authenticated` lacks UPDATE on `users.is_admin` |
| I2 | Every admin UAT route refuses an unauthenticated request | Route check | **New:** per route |
| I3 | Every admin UAT route refuses a signed-in non-admin | Route check; `isAdminUser` fails closed | **New:** per route |
| I4 | Admin identity comes from the session, never the request | Route | **New:** a body or header naming a user is refused or ignored |
| I5 | Admin status is re-read per request and from the database, so demotion takes effect immediately | `isAdminUser`, database guard | **New:** demoted admin refused at both layers |
| I6 | A database examination read requires `is_admin` on the actor, independently of the app | Access-log guard | **New:** DB test |

## Customer separation

| # | Invariant | Enforced by | Test |
|---|---|---|---|
| I7 | Customer routes keep their rules: submissions stop, invitation, approved inputs | `admit()`, unchanged | Exists: `customer-flow` suites |
| I8 | Admin status grants nothing on customer routes | Customer deps have no admin branch | **New:** admin on `/creator-record` behaves like any user |
| I9 | Customers never receive synthetic inputs | Inputs selected only in admin deps; port removed from customer deps in Phase 5 | Exists, extend: `synthetic-uat.test.ts` |
| I10 | A synthetic record can't be read through customer routes | `syntheticClosed` | Exists, extend |
| I11 | Ownership: a user sees only their own documents and versions; another's looks missing | Service checks, RLS with no policies | Exists |

## Synthetic versus real

| # | Invariant | Enforced by | Test |
|---|---|---|---|
| I12 | Admin UAT accepts only committed fixture bytes, even after real intake opens | `realDocumentsPermitted: false` fixed in admin deps; fixture lookup; database `(f)` check | **New** |
| I13 | Every synthetic record carries the synthetic authority inside its digest | Builder, source text approval | Exists |
| I14 | Every admin run is stamped `admin_synthetic_uat`, and never visible to customer paths | Function stamp, CHECK, default visible-boundary list | **New:** DB and unit |
| I15 | Replay only: `executor_mode = fixture_replay`, `model_calls = 0`, `prompt_sent = false` | CHECK, envelope validation | Exists |
| I16 | Observations stay `not_verified` and never change a conclusion | Envelope parser, `guidance-with-documents` tests | Exists |
| I17 | The isolated-test marker never exists in Production | CHECK refuses the Production ref | Exists |

## Payment, issuance and side effects

| # | Invariant | Enforced by | Test |
|---|---|---|---|
| I18 | No purchase route exists under admin UAT | Absence, route inventory | **New:** source scan |
| I19 | A synthetic version can't become a submission, even via the customer route, even after launch | Purchase gate, governance eligibility, v5-only issuance support | Exists, **extend** with `submissions: 'open'`, `issuance: 'enabled'` |
| I20 | Commercial locks stay as they are | Code constants | Exists: pin in the admin suite too |
| I21 | Admin UAT sends no email and calls no external service | Import closure | **New:** closure scan for `resend`, `stripe`, model SDKs |

## Evidence integrity and audit

| # | Invariant | Enforced by | Test |
|---|---|---|---|
| I22 | Reviewed versions, runs and access-log rows are immutable | Database guards | Exists |
| I23 | Every examination read is logged before bytes are read, with the real actor | Adapter order, guard | Exists |
| I24 | Historical grants, runs and records remain verifiable after the change | Forward-only migration; `verifyRunRow` reads no grant | **New:** existing E4 and PROD-9 boundaries still parse |
| I25 | Operator-seeded runs stay out of customer views | Visible-boundary list | Exists |
| I26 | Evidence stays private: signed-in owner or admin, every read logged | Bucket with no policies, file route | Exists |

## Not invariants

These are deliberately **not** security controls in the new model. Their absence must not be treated as a gap:
- A time window on administrator UAT.
- A per-session grant or binding code.
- Account bans after testing.
- Closure SQL.

## Bad practices to avoid

- Don't add a client-supplied "UAT mode" flag on customer routes.
- Don't use a ban as an authorization control.
- Don't make the customer path honour `is_admin`.
- Don't relax the 2-hour or non-admin grant rules; stop using grants.
- Don't delete grant rows or the test identity.
