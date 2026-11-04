# SI8 Production UAT: Migration Plan

**Status:** Phases 0 and 2–5 are implemented on `work/cr-v2-admin-uat` and validated locally, except the public harness removal, which waits for its 2026-11-10 expiry. Phase 1 was not needed: Q6 reported SAFE. The migration is `20261107000000_creator_record_v2_admin_uat.sql`, applied with `production-apply/08_apply_20261107.sql`. The phase detail below is the original plan.

## Sequence

| Phase | Goal | Migration? | Blocks |
|---|---|---|---|
| 0 | Answer Q6 | No (read-only) | Everything |
| 1 | Close the `is_admin` exposure, **only if Q6 reports EXPOSED** | Yes | Phases 2+ |
| 2 | Admin UAT page: questionnaire to review, no documents | No | |
| 3 | Admin examination: documents, runs, v6 | **Yes** | |
| 4 | Reopen past versions | No | |
| 5 | Retire temporary mechanisms | No | Phase 3 proven |

Phase 2 already ends new-identity testing for anything not involving documents.

## Phase 0: Q6 (minutes)

Run `Q6_is_admin_exposure.sql` in the Production SQL Editor. It reads only catalogs and admin account metadata, and changes nothing.

| Result | Next |
|---|---|
| All privilege rows SAFE | Record it, add the catalog test, go to Phase 2 |
| Row 1, 2, 9, 10 or 11 EXPOSED | Stop; treat as an incident; Phase 1 first |

Check rows 5–6 either way: every listed admin should be one you recognise.

## Phase 1: Close the exposure (if needed)

**`20261107000000_lock_users_self_update.sql`:**
```sql
REVOKE UPDATE ON public.users FROM anon, authenticated;
```

- **Affected code:** none found: there are no session-client writes to `users`, and the service role keeps its own grant.
- **`submissions`:** decide separately. Inventory session-client writes first, then restrict by column or revoke.
- **If exposed:** also review the admin list, recent `users.updated_at`, and `submissions` where payment state disagrees with the payment ledger.
- **Test:** a catalog check that `authenticated` lacks UPDATE on `users.is_admin`. Confirm profile pages still work.
- **Rollback:** `GRANT UPDATE ON public.users TO authenticated;`, only if something real breaks, and only with a narrower column grant.

## Phase 2: Admin UAT page

**New files**
- `lib/creator-record-flow/admin-uat.ts`
- `app/admin/creator-record-v2/uat/page.tsx`
- `app/api/admin/creator-record-v2/uat/prepared/route.ts`
- `app/api/admin/creator-record-v2/uat/prepared/[id]/route.ts`
- `app/api/admin/creator-record-v2/uat/prepared/[id]/review/route.ts`
- `__tests__/creator-record/admin-uat.test.ts`

**Changed files**
- `app/creator-record/CreatorRecordV2Client.tsx`: `apiBase` prop
- `__tests__/creator-record/creator-record-boundaries.test.ts`: allowlist additions
- `__tests__/creator-record/examination-ui.test.tsx`: literal-path assertions

**Not changed:** `service.ts` logic, customer routes, purchase, issuance, Living Knowledge, BI, Retrieval, locks.

**Regression tests:** I2–I5, I7–I11, I18–I21.

**Rollback:** revert the commit, or Vercel Instant Rollback. No data implications.

## Phase 3: Admin examination

**New**
- `supabase/migrations/20261107000001_creator_record_v2_admin_uat.sql`
- `app/api/admin/creator-record-v2/uat/evidence/route.ts`
- `app/api/admin/creator-record-v2/uat/evidence/[id]/examination/route.ts`
- `__tests__/db/creator-record-v2-admin-uat.db.test.ts`

**Changed**
- `lib/creator-record/examination/persistence.ts`: boundary list
- `lib/creator-record/customer-flow/examination.ts`: boundary parameter, customer default unchanged
- `lib/creator-record-flow/admin-uat.ts`: evidence and examination deps
- `components/creator-record/EvidencePanel.tsx`: `apiBase`
- The 20261105–06 static checks and `06_verify` expectations, as needed

**Order:** migration first (it only adds a refused-by-default branch for non-admins), verify, then deploy code.

**Regression tests:** I1, I5, I6, I12, I14, I15, I24, plus:
- Non-admin refused with no grant, exactly as today.
- Admin refused for non-fixture bytes.
- Admin refused for another user's document.
- A seeded document can't be examined this way.
- The grant path still behaves identically for history.
- A run under the new boundary passes `verifyRunRow` and projection.

**Verify on a disposable database first,** using the method already used for Q4 and Q5, then apply through the existing `production-apply` wrapper pattern, with one verify query.

**Rollback**
- **Before any admin run exists:** re-apply the 20261106 function bodies and the previous CHECK.
- **After an admin run exists:** forward-only. The CHECK must keep accepting that boundary, since history is append-only. Disable by re-applying only the function bodies, so new admin reads are refused and history remains valid.
- **App:** revert or Instant Rollback at any time.

## Phase 4: Reopen past versions

- **New:** admin-only recent-versions list and open-by-id on the UAT page.
- **Changed:** `PreparedStore` gains a listing method used only by admin deps.
- **Tests:** only the admin's own versions listed; non-admins refused; reopened view byte-matches the stored record.
- **Rollback:** revert.

## Phase 5: Retire temporary mechanisms

After at least one full UAT through Phase 3:

- **Remove:** `CREATOR_RECORD_V2_SYNTHETIC_UAT`, `syntheticUatWindowOpen`, the cap, `productionSyntheticUat`, and the `syntheticUat` port from customer deps, page and gates. Keep `syntheticUatInputs` and `isSyntheticRecordAuthority`.
- **Remove:** `scripts/creator-record-v2-uat/examination-uat.ts`, `lib/creator-record-flow/examination-uat.ts`, `__tests__/creator-record/examination-uat.test.ts`.
- **Archive:** `create_grant.sql`, `create_customer_path_grant.sql`, `revoke_grant.sql`, `remove_pilot_user.sql` (with a pointer in the README).
- **Remove:** `lib/creator-record/public-uat/*`, `app/uat/*`, `app/api/uat/*` and their tests, if D6 is approved and after 2026-11-10.
- **Keep:** all migrations, `production-apply/`, preflight queries, UAT records, and the grants table and rows.
- **Local secrets:** delete `CR-V2-UAT-PROD-9.binding-code.json`. Safe now; independent of this plan.

**Rollback:** revert. There's no schema involved.

## Delivery safeguards

Your step 2 ("validate with automated tests") has no enforced signal today.

1. **Minimum:** before each push, compare full-suite failures against a saved baseline and require no new ones, as done for the last three commits.
2. **Better, as separate work:** triage the 89 failures. Those examined are stale Matrix-retirement expectations or Windows line-ending hash checks, not all were examined, and some could hide real CRC defects.
3. **Best:** a CI workflow that runs Jest, so that `main` can't move on a new failure.

## Overall risks

| Risk | Mitigation |
|---|---|
| Admin credential compromise grants standing UAT, on top of everything admin already reaches | MFA (D4); UAT adds fixture-only, replay-only writes |
| Database guard change affects the examination path | Disposable-database proof; refused-by-default branch; forward-only disable |
| Client `apiBase` change breaks the customer path | Default unchanged; existing tests pin the paths |
| Synthetic rows distort future metrics | Filter on stamped authority and boundary; no customer dashboard exposure |
| Bad deploy reaches customers immediately | Instant Rollback; launch locks currently limit the exposure |
