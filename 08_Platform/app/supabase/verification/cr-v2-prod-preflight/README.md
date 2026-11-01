# CR-V2 Production Preflight — Operator SQL Verification Pack (CR-V2-PROD-2)

Six **read-only** queries for the SI8 Production Supabase SQL Editor (project `lehqgcgnenwdmuzudbrs`). They verify, before any migration or deployment:

- Production's table definitions;
- the existing Creator Record v1 payment and artifact exposure;
- the migration history;
- compatibility with M2 (`20261101000000`) and M3 (`20261102000000`).

**Nothing here writes.** Each file is a single `SELECT` (or `WITH … SELECT`) statement:
- no DDL, DML, grants, sequences, locks, session settings or configuration changes;
- no names, emails, titles, answers, payment intents, tokens or file paths are returned.

This is enforced by `__tests__/ops/cr-v2-prod-preflight-sql.test.ts`. Every query was also executed inside a `READ ONLY` transaction, on PostgreSQL 15, against the schema the repository's migrations produce.

## Before you start
- Open the SQL Editor of the **Production** project `lehqgcgnenwdmuzudbrs`, and check the project name in the header.
- If the editor offers a role selector, a read-only role is sufficient for all six queries.
- Open each file and paste its **whole contents** into a new, empty query tab. Run one file per tab; do not combine them.
- **Stop and report** if the editor ever asks you to confirm a destructive operation. None of these queries should trigger that.

## Run in this order

| # | File | Returns | Paste back |
|---|---|---|---|
| 1 | `q1_table_columns.sql` | one cell, `q1` (JSON) | the cell's full text, as `q1.json` |
| 2 | `q2_constraints_triggers_indexes.sql` | one cell, `q2` (JSON) | the cell's full text, as `q2.json` |
| 3 | `q3_functions_buckets.sql` | one cell, `q3` (JSON) | the cell's full text, as `q3.json` |
| 4 | `q4_migration_history.sql` | one cell, `q4` (JSON) | the cell, **or** the error text if `supabase_migrations` does not exist |
| 5 | `q5_v1_exposure.sql` | one cell, `q5` (JSON) | the cell's full text, as `q5.json` |
| 6 | `q6_m2_m3_compatibility.sql` | a grid of 21 rows | the whole grid (or "Export → CSV") |

Then add one more fact from outside the database: **Vercel → `si8-creator-portal` → Production deployment → the git commit SHA it is serving.**

How to copy a JSON cell: click the cell, then use the cell's copy action (or open it and select all). The text should start with `{` (or `[` for Q4). If the editor truncates the display, use **Export → CSV/JSON** instead.

## What the results mean
- **Q1–Q3:** the schema fingerprint. Diff them locally, offline (no connection):
  ```
  node compare.js expected/pre-m2 <folder containing q1.json q2.json q3.json>
  ```
  - `RESULT: MATCHES THE REPOSITORY (known differences only)` is the pass.
  - The two **known** differences are `submissions_tier_check` allowing `si8_certified` (no migration adds it), and the hand-made private `documents` bucket. Anything marked `DRIFT` must be explained before M2/M3 are applied.
  - Function bodies are compared by MD5, so a body that was re-pasted or changed through the SQL Editor shows up as drift.
- **Q4:** informational only. Migrations applied through the SQL Editor are not recorded, so Q1–Q3 and Q6 are the authority.
- **Q5:** pending v1 work.
  - `unpaid_v1_with_persisted_session`: open v1 Stripe sessions. Expire them in Stripe before deploying, or accept that they can still settle as v1 within their lifetime.
  - `paid_cr_without_any_pdf`, `ledger_cr_not_completed`, `artifacts_pending`: should be empty before deploying. Otherwise let the sweep, reconcile or admin retry finish them first.
  - `historical_downloads`: what must remain downloadable.
- **Q6:** every row with `ok = false` blocks M2/M3. Row 21 is informational. Expected in Production today: rows 1–20 all `true`.
  - Rows 1–6 `false` would mean M2/M3, or something using their names, already exists.
  - Row 14 or 15 `false` would break v2 submission creation.
  - Row 10 checks that the historical `documents` bucket is private.

After M2 + M3 have been applied (a later, separately authorised step), re-run Q1–Q3 and diff them against `expected/post-m3`. Rows 1–6 of Q6 then show `false` by design.

## Files
- `q1_…q6_*.sql`: the six queries.
- `compare.js`: offline diff of Q1–Q3 against `expected/`.
- `expected/pre-m2/`: the schema the repository's 42 migrations up to `20261028000000` produce. This is what Production should be today.
- `expected/post-m3/`: the same schema after M2 + M3.

Both expected sets were rebuilt on PostgreSQL 15 against a minimal Supabase stub. Supabase-managed objects outside these tables are not compared.

## Assumptions
- Q3, Q5, Q6 and the expected fingerprints read `storage.buckets` / `storage.objects`, which Supabase provides.
- **Not checkable read-only:**
  - whether Supabase lets the API role set the custom setting `si8.cr_v2_binding`, which M3's bind function sets (proven on PostgreSQL 15/17, not on Supabase);
  - whether PostgREST's schema cache reloads after M3. After applying M3, confirm `creator_record_product` is visible through the REST API before deploying code.
