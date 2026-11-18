# CR-PUBLIC-2A — Creator Record: Production UAT readiness

**Date:** 2026-11-18. **Kind:** read-only investigation and local preparation.

Nothing was published, activated, charged, refunded or written in Production. Production evidence comes from read-only queries
(counts, schema, and the one anomaly row's non-personal fields), public HTTP pages and Supabase's public auth settings endpoint.

**Labels:**
- **[Verified]** = checked independently in this milestone.
- **[Operator-confirmed]** = reported PASS by the operator; no supporting evidence was seen here.
- **[Unverified]** = neither.

## 1. State

- **Branch:** `work/cr-public-1` (worktree `C:\Users\User\Desktop\si8-cr-public-1`), one commit `64c0a002` on `origin/main`
  `b63c7cf1`. Not pushed.
- **Production:** `b63c7cf1`. Live `/terms` shows `terms-2026-11-14`, which still says invitation-only [Verified].
- **Access switch:** `CREATOR_RECORD_V2_ACCESS = 'invitation'`, unchanged.
- **This milestone changed locally:** the approved §2 sentence in the Terms draft, its test, and this document.

## 2. Terms

- **Approved §2 sentence (founder, CR-PUBLIC-2A):** "Creator Record is available to registered SI8 users, subject to these Terms
  and applicable eligibility, payment, and service requirements." It replaces "Creator Record is currently available by
  invitation only." Every other paragraph is carried over verbatim (tested).
- **Proposed version:** `terms-<publication date>` with the same effective date, following `terms-2026-11-14`. It passes the
  version pattern `^[a-z0-9][a-z0-9._-]{2,31}$`. The approval reference is assigned at release.
- **Required AI-permission identifier:** `cr-v2-ai-permission-1__privacy-2026-11-09__terms-<publication date>`.
- **Current Production authority row:** `cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-14` [Verified]. 5 grants
  recorded, 3 under the current identifier.

## 3. AI-permission replacement: **HOLD**

**The established procedure ("section W" of `operator-preflight.sql`, with `RELEASE-RUNBOOK.md` and `apply-cutover.py`) can't be
found** [Verified absent]. I checked:
- every one of the repository's 288 refs and its history;
- `SI8-private-evidence`;
- the local worktrees and scratch folders.

The Terms 2026-11-14 approval record shows it was run (Q9: one row, established 2026-11-14 15:21:07 UTC), but the script itself
is not held anywhere this session can read. **No replacement SQL has been written.**

**What the database enforces** (migration `20261113000000`) [Verified]:
- **One row only** (singleton primary key).
- **Never updated in place:** an `UPDATE` is refused, so replacement is delete and insert.
- **Format checks:** the identifier can't contain "draft" or "unapproved". The actor and reason are required.
- **No application access:** `PUBLIC`, `anon`, `authenticated` and even `service_role` have no access. Only an operator in the
  SQL Editor can change it.

**Effects of the change:**
- **A fail-closed window.** AI reading is unavailable from the moment the new Terms build is live until the row names the new
  identifier, and it stays unavailable if the row is wrong.
- **Prior permissions:** grants under `…terms-2026-11-14` stay as history and stop permitting examination. Each creator gives the
  permission again.
- **Uploaded documents:** files added under the old storage-consent identifier can't be reused in a new version under the new one.
- **Purchases and issuance:** checkout refuses while either policy is incomplete. Issuance of already-paid records doesn't depend
  on the Terms version.

**Rollback:** redeploy the `terms-2026-11-14` build, then restore the old row by delete and insert. Until then AI reading fails
closed (safe).

**To unblock:** the operator supplies the section W script (or its current equivalent) and confirms the version used for
`terms-2026-11-14`. Engineering then reviews it against this migration before any use.

## 4. Historical checkout anomaly (2026-10-21)

**What happened** [Verified; runbook `08_Platform/implementation/caa-3b/CAA_3B_FIX_1_RUNBOOK.md`]:
- The UAT checkout "UAT-3B-CR" used a 100% promotion code. It arrived at 14:30:02 UTC as `paid` with total $0 and no payment
  intent, which is Stripe's actual behaviour for a 100%-discounted payment-mode session.
- The ledger rule then in force required a payment intent for `paid`, so it was rejected (`payment_status_inconsistent`) and an
  anomaly opened (incident `CAA-SECURITY-3B-M2-2-INCIDENT-1`).

**Fixed:** FIX-1 (migration `20261022000000`, commit `e62e115`) was applied in Production at 15:33–15:35 UTC the same day. It
accepts a $0 `paid` session only with no payment intent; positive totals still require one. UAT-3B-CR2 then passed.

**Safely handled** [Verified now]:
- The row is unchanged: `rejected`, bound, $0 (subtotal 2900, discount 2900).
- Its submission is still `pending`/`unpaid`, with no accepted payment and no issued record. No money moved.
- History was not rewritten, by design.

**Test coverage:** `__tests__/db/payment-ledger.db.test.ts` covers:
- the $0 `paid` case with no payment intent, accepted;
- a $0 `paid` with a payment intent, rejected;
- partial discounts;
- "positive paid needs a PaymentIntent".

**97 of 97 passed against local disposable PostgreSQL in this milestone.** The unit suites `checkout-integrity` and
`stripe-webhook-integrity` pass.

**Closing it:** the established procedure is `reconcile_payment_fulfillment(session, 'resolve_anomaly', actor, note)`, through
`POST /api/admin/payments/[sessionId]/reconcile` by an admin, with a note of at least 5 characters. It exists in Production
[Verified]. It appends to the row's reconciliation log and changes only `anomaly_status`. **Needs separate authorization.**

## 5. Real US$29 payment and refund UAT (plan only; separately authorized)

**Preconditions:**
- Access stays `'invitation'`.
- The operator check of the discount codes is complete [Operator-confirmed: Stripe PASS].

**Test identity:** one dedicated SI8-controlled account ("A"):
- created in Supabase Authentication (auto-confirmed);
- invited with the established `archive/invite_pilot_user.sql`. That script refuses admins and accounts with history and needs
  a PM approval reference;
- removed afterwards with `remove_pilot_user.sql`.

**Steps:**
1. **A** signs in, completes the questionnaire (synthetic project data only) and reviews.
2. **Checkout:** pay **US$29 with no promotion code**, using an SI8-owned card.
3. **Webhook (read-only check):** the ledger row reads `outcome = accepted`, `stripe_payment_status = paid`,
   `amount_subtotal = amount_total = 2900`, `amount_discount = 0`, a `pi_…` intent, `session_binding = bound`. The submission is
   `paid`/`approved`.
4. **Issuance:** `fulfillment_status = completed`, `pdf_status = completed`, one `creator_record_artifacts` row `issued`,
   generator `creator-record-v2-pdf-v4`, and the confirmation email `accepted`.
5. **Download:** A downloads the PDF from the dashboard (200); its SHA-256 matches the artifact row.
6. **Stripe:** the receipt email arrives. In the Dashboard the payment equals US$29.00 and matches the `pi_…`, and the statement
   descriptor is correct.
7. **Refund:** a full refund in the Stripe Dashboard, to the original card.
8. **After the refund:** **the application does not process refund events.** The webhook handles only
   `checkout.session.completed`. Expected and correct for today's design:
   - the ledger row stays `accepted`;
   - the record stays issued and downloadable;
   - no new anomaly.

   Record the refund in `SI8-private-evidence` (payment intent, refund ID, amount, time). Whether a refunded record should lose
   access is a policy question; Terms §8 gives no such rule.
9. Exclude the record from customer counts by record ID, and remove A's invitation.

**Irreversible effects and costs:**
- **Stripe processing fee** on US$29, roughly US$1.14 at standard card pricing; Stripe does not return it on refund.
- **Permanent records:** the ledger row, the issued PDF and record ID, the auth account and the audit history.
- **A card statement line** and refund.

**Pass:** every check above. **Any failure stops public activation.**

## 6. Two-account isolation UAT (plan only; separately authorized)

**Identities:** A (from section 5, with its issued record) and a second dedicated account **B**, invited the same way. Synthetic
data only.

**Signed in as B, try A's resources** (IDs taken from A's session and network log):
- `GET /api/creator-record-v2/prepared/{A's version}` → 404
- `POST …/prepared/{id}/review` → 404
- `POST …/prepared/{id}/purchase` → 404
- `GET /api/creator-record-v2/evidence` → lists only B's
- `GET …/evidence/{A's doc}` → 404
- `GET …/evidence/{A's doc}/file` → 404
- `POST …/evidence/{A's doc}/examination` → 404
- `POST …/evidence/{A's doc}/deletion-request` → 404
- `POST /api/checkout/create-session` with A's submission ID → 404
- `GET /api/creator-record/{A's submission}/pdf` → 404
- `/dashboard` and `/dashboard/submissions/{A's}` → nothing of A's shown
- the browser-side Supabase client cannot read `submissions`, `payment_fulfillments`, `creator_record_artifacts` or
  `creator_record_v2_*` (role privileges were already verified as none)

**Expected:**
- every request answers as if the resource doesn't exist (404, the same as a random ID);
- no evidence-access log entry for B on A's documents;
- A still sees everything of its own.

**Cleanup:** remove both invitations. Keep the records as UAT history, excluded from counts.

## 7. Registration and abuse controls

**Application** [Verified]:
- sign-up calls Supabase Auth directly from the browser, with a Cloudflare Turnstile token (a site key is in the live bundle);
- `emailRedirectTo` goes to `/auth/callback?next=…`;
- there is no app-side sign-up endpoint and no rate limit of its own.

**Provider, from the public settings endpoint** [Verified]:
- `disable_signup: false` (open);
- `mailer_autoconfirm: false`, so **email confirmation is required**;
- email is the only enabled provider.

Production has 9 users, all confirmed.

**Provider, not visible from here** [Unverified]: whether Supabase **enforces** the Turnstile captcha server-side, and the auth
rate limits. Without enforcement, a script could bypass the widget. Operator check in Supabase: Auth → Attack Protection.

**Finding needing a fix (not implemented; authorization requested):** `POST /api/notify-signup` (live) is unauthenticated, has no
rate limit and doesn't check that a sign-up happened. It inserts the name and email it receives **unescaped** into an HTML email
to SI8's inbox. Once sign-up is public, anyone can trigger unlimited emails, with injected HTML, through Resend. Proposed minimal
fix, either:
- (a) escape the fields and send only if a matching, recently created auth user exists (service-role lookup), with a per-email
  limit; or
- (b) remove the browser-triggered call and notify from `/auth/callback` once the email is confirmed.

## 8. Release sequence (access stays `'invitation'` until step 8)

1. **Unblock section W** (section 3). Founder authorizes the Terms release.
2. **Terms build:** new Terms version, effective date and approval reference; tests updated; access `'invitation'`. Preflight
   (read-only): no paid-but-unissued order; one authority row. Deploy.
3. **Operator, the same session:** replace the authority row with the new identifier. Verify AI reading under a new grant only.
4. **Close the 2026-10-21 anomaly** with `resolve_anomaly` and a note.
5. **Fix `/api/notify-signup`** (if authorized) and confirm Supabase captcha enforcement and rate limits.
6. **Real-payment and refund UAT** (section 5).
7. **Two-account isolation UAT** (section 6).
8. **Only if 1–7 pass:** release `CREATOR_RECORD_V2_ACCESS = 'public'`, then verify with a new, uninvited account from sign-up to
   download.
9. **Website calls to action** (`SI8-WEB-LAUNCH-3A` §4), after step 8, with the website blockers closed.

**A failed step stops the sequence.** No later step runs, and access stays `'invitation'`.

**Rollback of step 8:**
- redeploy with `'invitation'`;
- paid orders still issue and download, since fulfilment doesn't depend on access;
- ownership, ledger and records are untouched.

## 9. External controls

| Control | Status |
|---|---|
| Anthropic provider-level spending limit for `CREATOR_RECORD_EXTRACTION_API_KEY` | **[Operator-confirmed] PASS.** No organization, workspace, limit amount or enforcement type was seen here. Record them in `SI8-private-evidence` |
| Stripe discount codes (active codes, limits, expiry) | **[Operator-confirmed] PASS.** Codes not seen here |
| Terms and permission checks | **[Operator-confirmed] PASS.** The live Terms version and authority row were independently [Verified] as above. The section W procedure is **missing** (section 3) |
| Supabase captcha enforcement and rate limits | **[Unverified]** |
