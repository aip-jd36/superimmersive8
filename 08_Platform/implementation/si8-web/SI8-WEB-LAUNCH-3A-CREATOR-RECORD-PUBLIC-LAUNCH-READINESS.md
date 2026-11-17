# SI8-WEB-LAUNCH-3A — Creator Record public self-service launch: readiness assessment

**Date:** 2026-11-17. **Kind:** inspection only. No code, configuration, payment-provider setting or Production record was
changed, and no payment was run.

**Evidence base:**
- **Repository:** `origin/main` `b63c7cf1`, which is what Production runs.
- **Production database:** read-only, aggregate and catalogue queries only; no individual record was read.
- **Live HTTP checks:** made on 2026-11-17.

**Labels:**
- **[Code]** = implemented in the repository.
- **[Prod-verified]** = exercised in Production. Unless stated, this means by the admin account's own UAT records, not by a
  member of the public.
- **[Unverified]** = not established either way.

## 1. Journey: what exists

| Step | Entry point (real routes) | State |
|---|---|---|
| Register | `https://app.superimmersive8.com/auth/signup?next=/creator-record`; `www.superimmersive8.com/auth/signup` redirects there | **[Code]** Supabase sign-up, Cloudflare Turnstile (a site key is in the live bundle), email confirmation, then `next` via `/auth/callback`. **[Prod-verified]** 9 accounts, all confirmed. **[Unverified]** whether Supabase enforces the captcha on its side, and any sign-up rate limits there |
| Sign in | `https://app.superimmersive8.com/auth/login?next=/creator-record`; the login page links to `/auth/signup` | **[Code] [Prod-verified]** |
| Create record | `https://app.superimmersive8.com/creator-record` (signed out: redirects to login) | **[Code]** questionnaire, A1/A2 acknowledgements (A2 = agreement to the Terms and acknowledgement of the Privacy Notice, both linked), optional uploads and live AI reading. **Gated:** a signed-in user without a `creator_record_v2_pilot_access` row sees "Creator Record is currently available by invitation only." Production: 1 row (admin) |
| Pay | `POST /api/creator-record-v2/prepared/[id]/purchase`, then `POST /api/checkout/create-session` | **[Code]** Stripe Checkout, server-built US$29 price, promotion codes allowed, idempotent and bound to the submission, eligibility re-checked before any Stripe call. **[Prod-verified]** 10 checkouts, **all US$0.00 with 100% codes**: 9 fulfilled, 1 rejected with an **open anomaly**. **No non-zero payment has ever been collected** |
| Payment verification | `POST /api/webhooks/stripe` plus the payment ledger (`payment_fulfillments`) | **[Code]** signature-verified, amount and binding checks (CAA-3B). **[Prod-verified]** for $0 sessions only |
| Generate record | Automatic after payment (`authorizeV2Issuance`, generator `creator-record-v2-pdf-v4`) | **[Code] [Prod-verified]** 9 issued artifacts. Refusals go to `needs_reconciliation` with an admin alert; refunds are manual |
| Download and account access | `/dashboard`, `/dashboard/submissions/[id]`, `GET /api/creator-record/[id]/pdf` (owner only, 12 months from issuance) | **[Code] [Prod-verified]** for the admin account. **[Unverified]** for a second, non-admin account (no cross-account check run in Production) |
| Documents and privacy controls | Deletion request, consent withdrawal, 90-day original retention | **[Code] [Prod-verified]** the retention sweep: 18 runs, 0 failed, last on 2026-11-17 |

## 2. Security, payment and isolation

**Verified:**
- **Isolation by database role:** `anon` and `authenticated` have **no privileges** on `submissions`, `payment_fulfillments`,
  `creator_record_artifacts` or `creator_record_v2_prepared`.
- **Row-level security:** enabled on all 23 Creator Record, payment and submission tables. The v2 tables have no policies, so
  they are service-role only. The old user policies on `submissions` are inert without table grants.
- **Ownership is enforced in server code;** `submissions.creator_record_product` is immutable (trigger).
- **Storage:** every Creator Record bucket is private (`creator-records`, `creator-record-evidence`, `documents`).

**Risks before opening to the public:**
1. **Real payments untested.** A non-zero live charge has never gone through:
   - Stripe live-mode keys;
   - receipts and statement descriptor;
   - tax handling;
   - refund handling (manual).
2. **Promotion codes.** `allow_promotion_codes: true`, and 100%, 50% and 30% codes exist in Stripe (comp and beta codes). Once
   checkout is public, any leaked code gives free or discounted records. Review which codes are active (a Stripe-side decision;
   not changed here).
3. **AI reading cost.** Readings run before payment. Production limits each creator to 3 attempts a day and US$1 in total, but
   **nothing caps spend across all accounts**, so many free accounts could each spend up to US$1. An Anthropic workspace spending
   limit is **[Unverified]**.
4. **Cross-account isolation is not verified in Production.** Only the admin account has ever used it. Run a two-account test
   before launch.
5. **Operational load.** Reconciliation, refunds, deletion holds and paused orders are all manual. There is also one open
   payment anomaly today.
6. **[Unverified]** Supabase-side captcha enforcement and auth rate limits; email-confirmation deliverability at volume.

## 3. Privacy and terms

- **Privacy Notice `privacy-2026-11-09`:** covers public self-service. It doesn't assume invitations, and it already describes
  the account, payment (Stripe), documents, AI reading (Anthropic), Cloudflare on sign-up, Google Analytics and retention.
- **Terms `terms-2026-11-14`: not ready.** §2 states "Creator Record is currently available by invitation only." Public launch
  needs a revised Terms version and founder approval. §6 (US$29 via Stripe, promotion codes, confirmed on payment) and §7
  (automatic PDF, refunds when it can't be issued) already fit self-service.
- **A Terms change has an operational knock-on.** Consent and AI-permission identifiers embed the Terms version
  (`<wording>__privacy-…__terms-…`). The operator has to replace the `creator_record_v2_ai_permission_authority` row by delete
  and insert; until then AI reading fails closed. Documents added under the old identifiers can't be reused. The
  Terms 2026-11-14 change set the precedent: a drain and the row move.
- **Website:** the Website Privacy Notice draft doesn't cover Creator Record. Its own notice does. The site needs to link to it
  once the journey is public.

## 4. Website calls to action: planned changes, made only at activation

| Where | Now | At public launch |
|---|---|---|
| `/creator-record` (2 buttons) | "Request access" → `/contact?inquiry=creator_record_access` | Frozen label "Create a Creator Record · $29" → `https://app.superimmersive8.com/auth/signup?next=/creator-record` |
| `/contact` inquiry type "Creator Record access" (added in IMPL-3a, not in the freeze) | Present | Remove, as in the freeze |
| Header, home and pricing "Explore Creator Record" | → `/creator-record` | Unchanged |
| "Sign in" | → `/auth/login` | Unchanged; optionally add `?next=/creator-record` |
| `browser-check.mjs` "no link to sign-up" rule; `allowedExternal` | Forbids sign-up | Allow exactly the approved sign-up URL; still forbid checkout or payment links |

These are not made now: they would send visitors into an account that then says "invitation only".

## 5. Smallest safe sequence

1. **Founder decisions:**
   - revised Terms §2 (and version);
   - promotion-code policy;
   - a cross-account AI spend cap, or confirmation of an Anthropic workspace limit;
   - who handles refunds and reconciliation.
2. **CR-PUBLIC-1, app (local, tested):**
   - replace the invitation check in the 4 services and on the page with one access switch (`invitation` | `public`), default
     `invitation`;
   - add the cross-account AI cap if chosen;
   - the new Terms version.
3. **Pre-launch Production checks (each authorized):**
   - deploy with the switch still `invitation`;
   - rotate the AI-permission authority row for the new Terms;
   - one real US$29 live payment by SI8, then its issuance, download and refund;
   - a second-account isolation test;
   - resolve the open anomaly.
4. **Open access:** set the switch to `public` (authorized release) and verify sign-up through download as a new, non-admin user.
5. **Website release** with the section 4 call-to-action changes, after the website blockers (Website Privacy Notice,
   `/sample`, the legacy endpoints and contact-form configuration) are closed. The app opens first, so no website link ever
   points to a closed gate.

## 6. Recommendation

- **HOLD on public self-service activation.**
- Already Production-proven, but only for the admin account and only at $0: registration, sign-in, record creation, $0
  checkout, issuance, download and retention.
- Blocking items:
  - the invitation-only Terms;
  - no non-zero live payment ever collected;
  - the invitation gate in code;
  - promotion-code exposure;
  - no cross-account AI spend cap;
  - untested cross-account isolation.
- **GO** on step 1 (decisions) and step 2 (CR-PUBLIC-1, local).