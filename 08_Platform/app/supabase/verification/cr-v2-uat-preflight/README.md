# CR-V2-PROD-UAT-B: Read-Only Preflight Before Migrations 20261104000000 + 20261105000000

**Production is past this pack.** Both migrations were applied on 2026-11-03 (operator-reported; `08_Platform/implementation/CR_V2_PROD_UAT_D_MIGRATION_RECORD.md`). There, U1 now returns every value `true`, and the "before the migrations" expectations below no longer apply.

Four **read-only** queries for the SQL Editor of the target project. Each one is a single `SELECT` that writes nothing; `__tests__/ops/cr-v2-uat-preflight-sql.test.ts` enforces this. Each query was also executed inside a `READ ONLY` transaction on PostgreSQL 15, against the schema the repository's migrations produce (`__tests__/db/creator-record-v2-operator-uat.db.test.ts`).

None of them returns personal data, ids, file names, paths or consent text: only booleans, counts and catalog definitions.

This pack supersedes the earlier one-off DOC-2C OPS-1 non-execution check, which U1 covers.

| # | File | Expect before the migrations | If not |
|---|---|---|---|
| U1 | `u1_object_presence.sql` | every value `false` | **Stop.** Part of DOC-2C-B or PROD-UAT-B already exists. |
| U2 | `u2_document_provenance.sql` | `provenance_establishable: true` | **Stop.** 20261105000000 would refuse anyway. A document without the intake's consent value has unknown provenance, so a separate decision is needed before anything is classified. |
| U3 | `u3_doc1_fingerprint.sql` | `node compare.js <u3.json>` prints `MATCH` | **Stop.** The DOC-1 objects differ from the committed migration. |
| U4 | `u4_migration_history.sql` | `"recorded": []`, or an error that `supabase_migrations` does not exist | **Stop.** The CLI history claims a migration that U1 says is absent, or the reverse. |

**What U2 can and can't show.** U2 is consistency evidence only. `provenance_establishable: true` means every row is consistent with having been written by the DOC-1 intake. It is **not** proof that any user completed a consent step.

Also record from outside the database: the deployed commit for `si8-creator-portal`, and that `POST /api/creator-record-v2/evidence` and `/prepared` still answer 401 or 503.

## After applying both migrations

1. Reload the PostgREST schema cache, so the API sees the replaced write function, the new status function and the new columns:

   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

2. U1 must return every value `true`.

No grant exists until `create_grant.sql` is run. The test identity, seeding and examination steps are in `supabase/operator/creator-record-v2-uat/README.md`.

## Notes

- **U3 and line endings.** A function body may differ from `expected/u3_post_doc1.json` **only** by line endings, depending on how the DOC-1 file was pasted when it was applied. `compare.js` accepts the LF or the CRLF form of the committed body and nothing else.
- **Evidence, not proof.** These are operator safeguards and consistency evidence. They don't prove the database's identity, and they don't prove that any user consented. `20261105000000` re-checks document provenance itself, under a table lock, and refuses rather than misclassifying a row.
