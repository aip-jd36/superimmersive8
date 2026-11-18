# CR-PUBLIC-2A-FIX — AI-permission authority replacement: proposed operator runbook

**Status: PROPOSED — NOT AUTHORIZED.** Reconstructed on 2026-11-18 from the schema, the application and the 2026-11-14 release
record, because the original "section W" script can't be found (`CR-PUBLIC-2A-PRODUCTION-UAT-READINESS.md` §3). It makes no
assumption about that script's text.

- **Script:** `08_Platform/app/supabase/operator/creator-record-v2-terms/replace_ai_permission_authority.sql`.
- **Tested:** verbatim on disposable local PostgreSQL by `__tests__/db/creator-record-v2-ai-permission-replacement.db.test.ts`
  (8/8). **Never run in Production.**

## 1. What governs the row (migration `20261113000000`)

| Fact | Effect on the procedure |
|---|---|
| `singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton)` | At most one row: insert a second and it fails |
| `BEFORE UPDATE` trigger raises "not changed in place" | Replacement must be delete and insert; the script never updates |
| `permission_version` CHECKs: `^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$`, not `draft`/`unapproved` | The new identifier must be well formed; the script also requires the `cr-v2-ai-permission-N__privacy-…__terms-…` shape |
| `established_by` 1–200 characters, `reason` 1–500, `created_at` default now | Recorded on insert |
| No privileges for `PUBLIC`, `anon`, `authenticated`, `service_role` | Only the database owner (an operator in the SQL Editor) can run it; the application can't change it |
| `creator_record_v2_grant_ai_examination_permission` records a grant only when `p_permission_version` equals `creator_record_v2_current_ai_permission_version()` | Grants are checked against whatever row is current at that moment |
| `creator_record_v2_ai_permission_guard` (live read, reservation, `live_model` attempt) requires a grant of exactly the current version | After the swap, only grants of the new version permit examination |
| No history table for the authority row | Delete is final: record the old row first (P1) |

**Identifier construction:** `boundAuthorizationVersion(wording.id, { privacy, terms })` gives
`cr-v2-ai-permission-1__privacy-<privacy version>__terms-<terms version>`. After the public-access Terms it becomes
`cr-v2-ai-permission-1__privacy-2026-11-09__terms-<publication date>`. A test pins this
(`cr-public-terms-versioning.test.ts`). Compare the value with the deployed build's `/creator-record` page, which sends it.

## 2. Preconditions

1. Founder authorization for the Terms release **and** for this run, with an approval reference.
2. The Terms build is deployed: `/terms` shows the new version.
3. **Read-only preflight**, results recorded in `SI8-private-evidence`:
   - **P1:** `SELECT permission_version, established_by, reason, created_at FROM public.creator_record_v2_ai_permission_authority;` →
     exactly 1 row, today `cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-14`. **Keep these values**: they are the
     rollback input.
   - **P2:** `SELECT public.creator_record_v2_current_ai_permission_version();` → the same value.
   - **P3:** `SELECT permission_version, count(*) FROM public.creator_record_v2_ai_examination_permissions GROUP BY 1;` → the counts
     by version (2026-11-18: 5 grants, 3 under the current version).
   - **P4a** (validated 2026-11-18): no Creator Record v2 order paid but not issued. Expected 0.
     `SELECT count(*) FROM public.submissions s WHERE s.creator_record_product = 'v2' AND s.payment_status = 'paid' AND NOT EXISTS (SELECT 1 FROM public.creator_record_artifacts a WHERE a.submission_id = s.id AND a.status = 'issued');`
   - **P4b:** no ledger row in progress or needing attention. Expected 0.
     `SELECT count(*) FROM public.payment_fulfillments WHERE fulfillment_status NOT IN ('completed', 'not_required');`
   - Don't use a ledger-only check ("accepted `creator_record` without an issued v2 artifact"). It also matches the V1 record
     issued on 2026-10-21, which V1 issues as a `rights_packages` row, not a v2 artifact: 1 false positive today.
4. The new identifier is confirmed to equal the deployed build's.

## 3. The replacement transaction

- Fill the four `EDIT` constants:
  - `c_expected_current` = P1;
  - `c_new_version` = the new identifier;
  - `c_operator`;
  - `c_change_ref`.
- Run the whole file once in the SQL Editor. It is one `DO` block, so one transaction.

The block:
1. Refuses on any unfilled, malformed, draft or unchanged value.
2. Takes `SHARE ROW EXCLUSIVE` on the table, blocking concurrent writers. Readers continue and see the old row until commit.
3. Refuses unless exactly one row exists and it equals `c_expected_current`.
4. `DELETE … WHERE singleton AND permission_version = c_expected_current` (must remove 1 row), then `INSERT` the new row with
   the actor and reason.
5. Re-reads `creator_record_v2_current_ai_permission_version()` and refuses unless it equals `c_new_version`. Any refusal rolls
   back the whole block.

**Why this respects the constraints:**
- It never issues an `UPDATE`, so the guard isn't triggered.
- The primary key keeps it to one row.
- Both statements commit together, so no other session ever sees an empty table (tested: a second session reads the old value
  before commit and the new one after).

## 4. Verification (expected outcomes)

- **V1:** `SELECT permission_version, established_by, reason FROM public.creator_record_v2_ai_permission_authority;` → exactly one
  row: the new identifier, the operator, `CR-PUBLIC Terms release: <ref>`.
- **V2:** `SELECT public.creator_record_v2_current_ai_permission_version();` → the new identifier.
- **V3:** P3 unchanged. Grants are history and never deleted.
- **V4 (application):** an internal test account opens `/creator-record` and gives AI permission for a synthetic document. A
  grant row with the new identifier appears.
- **V5:** a document granted only under the old identifier asks for permission again; no examination runs.
- **V6 (separately authorized):** one real model reading under the new grant.

## 5. Effects

**The fail-closed window:**
- **Before the swap:** from the Terms deploy until the swap commits, the build asks for the new identifier while the database
  still holds the old one. New grants are refused and examination of new-version grants is impossible, so **AI reading is
  unavailable**.
- **After the swap:** old-version grants no longer permit examination.
- **Keep the window short:** run the swap in the same session as the deploy.
- **Optional:** pause new submissions for the window, as with Build A on 2026-11-14.

**Existing grants:** kept as append-only history. They stop permitting examination; each creator gives the current permission
again per document.

**Uploaded documents:** stay stored; retention and deletion are unchanged. Documents uploaded under the old storage-consent
identifier can't be reused in a new version under the new one (existing application rule). Issued records are unaffected.

**Purchases and issuance:** unaffected by the swap. Checkout depends on both policies being published, not on this row.

## 6. Rollback and failure handling

| Situation | Action | Result |
|---|---|---|
| Script refuses | Nothing changed; read the message, correct the constant or precondition, rerun | Old row current |
| Wrong identifier committed | Run the script again with `c_expected_current` = the wrong value, `c_new_version` = the correct one | Correct row current |
| Terms build rolled back | Run the script with the constants swapped (new → P1 value). The deleted row's actor, reason and time are not restored; the reason records the rollback | Old identifier current; grants made under the new version stop permitting examination |
| Row deleted without insert (shouldn't happen: one block) | Insert the intended row (with this script's checks, one row expected, so use the P1 values) | Until then nothing is examined (fail closed) |

## 7. Validation against Production (CR-PUBLIC-2A-FINAL, 2026-11-18, read-only as `supabase_read_only_user`)

| Item | Production | Consequence for the script |
|---|---|---|
| Table owner | `postgres` | The SQL Editor runs as the owner, so it can delete and insert |
| Row security | enabled, **not forced**, 0 policies | The owner bypasses RLS and sees the row; no application role can |
| DELETE privilege | `postgres` only (`anon`, `authenticated`, `service_role`: none) | Only an operator can run the procedure |
| Columns and defaults | `singleton` (default true), `permission_version`, `established_by`, `reason`, `created_at` (default now) | Matches the script's `INSERT` |
| Constraints | primary key `singleton`; `CHECK (singleton)`; the two identifier CHECKs; `established_by` 1–200; `reason` 1–500 | Same as the migration. The script's reason (`CR-PUBLIC Terms release: <ref>`) fits under 500 |
| Triggers | `creator_record_v2_ai_permission_authority_guard`, `BEFORE UPDATE`, enabled | The script never updates |
| Function bodies | the current-version, grant, live-guard and authority-guard functions are **byte-identical** to migration `20261113000000` (MD5 of the deployed source equals the file's, CRLF) | The local PostgreSQL test exercised the same logic Production runs |
| Current row | `cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-14` | This is `c_expected_current` |
| P4a / P4b today | 0 / 0 | No pending paid order would be affected |

**Locking:** `SHARE ROW EXCLUSIVE` conflicts with every writer (including another run of the script) and not with reads. The
grant and guard functions only read the table, so they keep working and see the old row until commit, then the new one. No
session ever sees no row.

## 8. Unresolved assumptions

- **Transaction behaviour:** the Production SQL Editor running one `DO` block atomically (as all earlier operator scripts
  assumed). Wrapping it in `BEGIN; … COMMIT;` removes the assumption.
- **The Production SQL Editor's transaction behaviour** for a single `DO` block is assumed to be atomic, as the earlier operator
  scripts assumed (`archive/invite_pilot_user.sql`). Optionally wrap the block in `BEGIN; … COMMIT;`.
- **The script is new.** It is not the historical section W script. If the operator finds that script, compare the two before
  use.
