# CR-PUBLIC-2A-FINAL — Authentication security and the minimum Production UAT sequence

**Date:** 2026-11-18. Local only. Production remains invitation-only; nothing was run, written or charged.

## 1. Redirect fix (`lib/auth/safe-redirect.ts`)

**Before:** `/auth/callback` (server redirect) and `/auth/login` (`router.push`) accepted any `next` starting with `/`.
`//evil.example` is protocol-relative, so either could send a signed-in user to another site.

**Now:** both call `safeRedirectPath`, which returns an application-relative path on this origin or `/dashboard`. It rejects:
- protocol-relative values;
- backslashes and control characters, raw or percent-encoded;
- malformed encoding;
- absolute URLs and other schemes;
- values over 2048 characters;
- **dot segments that normalise to `//host`** (`/.//evil`, `/a/..//evil`, `/%2e//evil`). The test suite found this case; the
  result is now checked after normalisation.

Internal paths, query strings and anchors are kept. 48 tests (`__tests__/security/safe-redirect.test.ts` plus the
sign-up-notification suite) cover it.

## 2. Sign-up notification semantics (CR-PUBLIC-2A-FIX, reviewed)

The rule is to notify when `/auth/callback` exchanges a confirmation code and Supabase shows the email confirmed within the last
15 minutes. For an informational admin email, this is sufficient. It is not an audit record; `auth.users` remains the source of
truth for who signed up.

| Case | Result |
|---|---|
| Normal sign-up, link opened in the same browser | One notification |
| Link replayed | None (the code is single-use) |
| Old account reaching the callback | None (outside the window) |
| **Link opened in a different browser or device** | **Missed.** The browser client (`@supabase/ssr`) uses PKCE, so the exchange needs the code verifier stored where sign-up started. Supabase confirms the email, but the exchange fails, so no session and no notification. The user then signs in normally |
| **Email provider failure** | **Missed** (logged as a fixed code; never retried) |
| **A second confirmation link exchanged within 15 minutes of confirming** (for example a resent email, then both clicked) | **Possible duplicate.** Rare and harmless (one extra admin email) |
| Unconfirmed sign-ups | Not notified (the old route notified before confirmation) |

**No persistent event tracking was added.** No security or operational requirement needs it: missing or duplicate admin emails
expose nothing and change nothing. If complete counts matter, read `auth.users`.

## 3. Can payment and isolation UAT precede the Terms change? **Yes.**

An invited, non-admin SI8 test account can complete a genuine US$29 payment, issuance, download and refund under the
**published** Terms `terms-2026-11-14` and the **current** AI-permission row.

**Why there's no dependency on the Terms migration:**
- **Contract:** Terms §2 today says "available by invitation only". An SI8-controlled account invited for the test is within it.
  §6 (US$29 via Stripe), §7 (automatic issuance) and §8 (manual refunds) already apply.
- **Access:** the account needs an invitation row. The established `archive/invite_pilot_user.sql`:
  - accepts only a fresh, non-admin identity on the Production project;
  - inserts one row and nothing else;
  - needs a PM approval reference.

  `remove_pilot_user.sql` removes only that row. Both are documented for synthetic UAT, so reusing them for a real-payment test
  needs explicit PM approval; the fixed reason text says "synthetic UAT identity".
- **Checkout gates:**
  - issuance `enabled`;
  - submissions `open`;
  - both policies published (`legalPoliciesApproved`);
  - eligible governance;
  - approved templates.

  None depends on public access or on a new Terms version.
- **AI reading is optional for a record.** If the test includes one, the current authority row
  (`…__terms-2026-11-14`) matches the identifier the deployed build asks for, so it works today without any swap.
- **Fulfilment, issuance and download** don't consult invitations or Terms versions. After the invitation is removed, the owner
  can still download their PDF (12 months).
- **Refunds:** manual in Stripe. The application ignores refund events, so the record stays issued and the ledger `accepted`.

**Recommendation: run payment and isolation UAT first, before any Terms change.** It tests the money path against the current
configuration and keeps the AI-permission swap out of the payment test. After the Terms migration, re-verify only what depends
on it:
- the new identifiers on `/creator-record`;
- a new AI-reading grant;
- an old grant no longer permitting examination;
- checkout still offered.

## 4. Minimum sequence (each step separately authorized; any failure stops the sequence)

1. **Release this branch's fixes, with access `'invitation'` and the Terms unchanged.** The release carries:
   - the access switch (inert);
   - the redirect fix;
   - the sign-up notification fix.

   It is needed before any public sign-up. It is not needed for the invited UAT, but it is low risk to release first.
2. **Close the 2026-10-21 anomaly** with `resolve_anomaly` and a note.
3. **Payment and refund UAT** (`CR-PUBLIC-2A-PRODUCTION-UAT-READINESS.md` §5): account A, invited.
4. **Two-account isolation UAT** (§6): accounts A and B. Then remove both invitations.
5. **Terms release:**
   - new version `terms-<date>` with the approved §2;
   - preflight P1–P4b (`CR-PUBLIC-2A-FIX-AI-PERMISSION-RUNBOOK.md`);
   - deploy;
   - the authority swap in the same session;
   - verification V1–V5.
6. **Supabase:** confirm the captcha is enforced and the auth rate limits are set (an operator check).
7. **Public access:** set `CREATOR_RECORD_V2_ACCESS = 'public'`, then a new, uninvited account goes from sign-up to download.
8. **Website calls to action.**
