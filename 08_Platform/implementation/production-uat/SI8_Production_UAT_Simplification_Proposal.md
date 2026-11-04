# SI8 Production UAT: Simplification Proposal

**Status:** approved (PM GO) and implemented on `work/cr-v2-admin-uat`. See "Implementation notes" at the end for where the build differs from this text.

## 1. Recommendation

Add one **admin-only UAT page** at `/admin/creator-record-v2/uat`, running the real customer journey on synthetic inputs.

An existing administrator signs in and uses it. No new users, invitations, grants, windows, bans, binding codes or SQL are involved in routine testing.

**Precondition:** `is_admin` must not be self-writable in Production (Current Architecture, §6). This model makes `is_admin` the authority for UAT, so it can't ship until Q6 says SAFE.

## 2. Why this is small

The customer service already takes its gates as injected dependencies. So the admin path needs **no change to `preparePrepared`, `getPrepared` or `reviewPrepared`**, only a different set of ports:

```ts
// lib/creator-record-flow/admin-uat.ts (proposed)
export function adminUatFlowDeps(adminId: string): FlowDeps {
  return {
    ...productionFlowDeps(),
    submissions: 'stopped',                  // fixed: the customer gate's "synthetic only" branch, before and after launch
    hasPilotAccess: async () => true,        // the admin check already happened in the route
    syntheticUat: { admits: (id) => id === adminId, inputs: syntheticUatInputs },
    examinations: adminUatProjections,
  }
}
```

The existing `admit()` then serves synthetic inputs, and `syntheticClosed()` keeps those records unreadable on the customer path. Evidence and examination deps follow the same pattern, with `realDocumentsPermitted: false` hard-coded so admin UAT stays fixture-only even after real intake opens.

**No purchase deps exist for this path**, and the page passes `paymentOpen={false}`.

## 3. What changes

### Application

| Item | Change |
|---|---|
| `lib/creator-record-flow/admin-uat.ts` | **New:** the deps above |
| `app/admin/creator-record-v2/uat/page.tsx` | **New:** under the existing admin layout; renders the existing client |
| `app/api/admin/creator-record-v2/uat/{prepared, prepared/[id], prepared/[id]/review, evidence, evidence/[id]/examination}/route.ts` | **New:** thin routes: admin check, then the existing service call. **No purchase route.** |
| `CreatorRecordV2Client.tsx`, `EvidencePanel.tsx` | A new `apiBase` prop, defaulting to today's paths |
| `customer-flow/examination.ts` | The projection and history functions take their visible boundaries as a parameter; the default stays customer-only |
| `examination/persistence.ts` | Adds `admin_synthetic_uat` to `EXECUTION_BOUNDARIES` |

**Reopening a version:** the page can't reopen a past version today, which is why version 4 couldn't be viewed after its deployment. The proposal adds an admin-only recent-versions list (Phase 4), so step 7 of your workflow works.

### Database: one required migration

Examination authority lives in the database, and can't be delivered by a long-lived grant: grants are capped at 2 hours, must name a non-admin identity, and allow one active at a time. So:

**`20261107000000_creator_record_v2_admin_uat.sql` (proposed):**
- **Access-log guard:** with no marker and no active grant, accept an examination read when the actor has `is_admin = true`, owns the stored document, and it has `origin = 'owner_upload'` and a committed fixture hash. Otherwise, refuse exactly as today.
- **Write function:** the same authority branch; stamps `execution_boundary = 'admin_synthetic_uat'`.
- **Run CHECK:** allow `admin_synthetic_uat` with `uat_grant_id IS NULL`.

The database re-reads `is_admin` itself, so a route defect can't turn a non-admin's read into a permitted one. Non-admins stay refused in Production, as today.

**Applied once by hand**, like every migration. This is a one-time deployment step, not per-UAT SQL.

**Separately, a prerequisite if Q6 reports EXPOSED:**
```sql
REVOKE UPDATE ON public.users FROM anon, authenticated;
```
Similar treatment for `submissions`, only after checking what the customer path writes through a session client.

### Rejected alternatives

| Alternative | Why not |
|---|---|
| Admit admins on `/creator-record` | Mixes modes on a customer route; after launch, an admin would get real or synthetic inputs depending on a flag |
| A long-lived grant | Blocked by the 2-hour CHECK and the non-admin rule; loosening those weakens the existing path for no gain |
| Persist nothing, as the admin prototype does | v6 records need a persisted, re-verified run; it wouldn't test the real journey |
| A new role or permissions table | A second authorization framework, when `is_admin` is enough |
| A dedicated permanent test account | Requires shared credentials, and is what you've asked to stop |

## 4. What gets removed, deprecated or retained

| Item | Routine UAT need? | Disposition |
|---|---|---|
| Temporary invitations | No | Stop for UAT; **retain the table and `invite_pilot_user.sql` for customers** |
| Time-limited grants, manual revocation | No | Stop; **table and rows retained permanently** (runs reference them) |
| Account bans | No | Stop |
| Binding-code files | No | Stop; delete the current file |
| Production SQL Editor for open/close | No | Stop; migrations still need it once each |
| Closure verification queries | No | Stop |
| `CREATOR_RECORD_V2_SYNTHETIC_UAT` window code | No | **Remove**, including the `syntheticUat` port from customer deps. This tightens the customer path. |
| `examination-uat.ts`, `lib/creator-record-flow/examination-uat.ts`, `create_*grant.sql`, `revoke_grant.sql`, `remove_pilot_user.sql` | No | **Archive or remove** after Phase 3 is proven |
| `production-apply/`, rollback files, preflight queries | No | Keep as the historical record |
| Grant-kind branches inside the guard functions | No | **Keep for now:** removing them is risky database surgery for no user benefit |
| Applied migrations | n/a | Never edited |

## 5. Is the test-account ban necessary?

**No. I previously told you it was worth finishing; on this review, I withdraw that.**

- The account's access is already closed by authorization: no window, no invitation, a revoked grant, not an admin.
- A ban would only stop it signing in as an ordinary user, and **anyone can get an ordinary account from the public signup page**. It protects nothing a new signup wouldn't have.
- If `is_admin` were self-writable, a ban still wouldn't help, for the same reason. The fix is the grant.

**Recommendation:** leave it inactive and don't delete it, since history depends on it (`ON DELETE RESTRICT`). Optional: reset its password to an unknown random value. Same reasoning applies to the E4 identity, whose ban lapses on 2026-11-10; no action needed.

## 6. Public harness versus admin routes

**Keep them separate, and let the public harness expire on 2026-11-10 07:00 UTC, as already planned. Don't extend it.** It's passwordless, in-memory and needs no database, so its risk is low, but it's the wrong shape for a persistent model.

Remove its code in Phase 5, unless you still need a logged-out path for cloud-browser testing; that's a decision for you. The existing stateless admin prototype can stay.

## 7. Limits of this model

- **Synthetic wording only:** guidance shows `[TEST ONLY]` placeholders, because no real ledger entries are approved. This tests behaviour, not real content.
- **Same fixtures repeat:** re-uploading a fixture returns the same document and run. That gives repeatability, not a clean slate.
- **After a receipt-profile version change,** a second run for a document makes that document fail closed (`multiple_runs`), because which run a record carries is undecided. Use a different fixture until that's decided.
- **Quota:** 24 live documents per user, against 45 fixtures.
- **Records accumulate:** confirmed versions are immutable. That's by design, so admin accounts will build up synthetic history. It stays identifiable by its stamped authority and boundary.

## 8. Decisions needing your approval

| # | Decision | Recommendation |
|---|---|---|
| D1 | **If Q6 is EXPOSED:** apply the revoke and audit the admin list immediately | Yes, ahead of everything else |
| D2 | Make `is_admin` the persistent authority for Production examination replay (a change from "non-admin identity only") | Yes, with the database re-check; replay only, no model calls |
| D3 | Synthetic records stored under real admin accounts | Yes; identifiable by stamp, not visible on the dashboard |
| D4 | Require MFA on admin accounts (no MFA code found in the app; dashboard settings not checked) | Yes: this password becomes a standing test credential |
| D5 | Remove the window code and customer-side `syntheticUat` port | Yes, after Phase 3 is proven |
| D6 | Public harness: expire and remove | Yes, unless a logged-out path is still needed |
| D7 | Test identity: inactive, no ban, no deletion | Yes |
| D8 | Retention for synthetic evidence | Defer; keep everything for now |

## 9. Implementation notes

The build follows this proposal, with these differences:

- **Q6 was SAFE,** so Phase 1 was skipped and the admin migration took the number `20261107000000`.
- **`invite_pilot_user.sql` was archived, not retained.** The proposal said to keep it for customers, but its own checks refuse any real creator and it stamps a UAT reason on the row. So **no customer invitation script exists now**; the pilot table and its gate are unchanged. Customer pilots will need their own reviewed script.
- **Shared request handling:** the customer prepare, upload and examine routes now call `lib/creator-record-flow/route-handlers.ts`, so the admin routes parse bodies identically. Behaviour is unchanged and pinned by the existing tests.
- **An active grant doesn't block an administrator,** and an administrator doesn't consume a grant's budget. Grants are no longer in routine use.
- **Project ref label:** admin runs record the Production ref, because a database can't identify its own project. A staging database carries the marker and takes the marker path instead.
- **Public harness:** left untouched until its 2026-11-10 expiry, then removed as a separate change.
