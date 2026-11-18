# CR-PUBLIC-1 — Creator Record public self-service: Production activation checklist

> **COMPLETE — founder accepted (2026-11-18).** The launch was executed as one coordinated release (`ece9b196`); the
> rows below are the historical plan. Production state, smoke evidence and accepted residual risks:
> `CR-PUBLIC-LAUNCH-CLOSURE-RECORD.md`.


**Status:** preparation only (2026-11-18; updated by CR-PUBLIC-2A, whose detailed plans are in `CR-PUBLIC-2A-PRODUCTION-UAT-READINESS.md`). Nothing below has been done. Each numbered step is a separate Production action that
needs its own authorization.

**Branch:** `work/cr-public-1` (worktree `C:\Users\User\Desktop\si8-cr-public-1`), from `origin/main` `b63c7cf1`.

## What CR-PUBLIC-1 prepared (local)

- **One access policy:** `lib/creator-record-flow/access-policy.ts`, constant `CREATOR_RECORD_V2_ACCESS` = `'invitation'`.
  - Any value other than exactly `'public'` means invitation-only.
  - Every Production port binds `hasCreatorRecordAccess` (`lib/creator-record-flow/pilot-access.ts`): the flow and purchase
    deps, evidence intake and customer examination. The `/creator-record` page uses the flow deps.
  - Authentication, ownership, payment verification and database access are unchanged. Fulfilment, issuance and downloads never
    consulted the invitation.
- **Terms revision draft:** `CR-PUBLIC-1-TERMS-REVISION-DRAFT.md` (this folder). One sentence in §2, with its own sequencing.

## Checklist (in order)

| # | Step | Evidence required | Today |
|---|---|---|---|
| 1 | **Terms:** founder approves the revision; release the Terms build (access still `'invitation'`); operator replaces the AI-permission authority row; verify AI reading under the new grant only | The sequence and checks in `CR-PUBLIC-1-TERMS-REVISION-DRAFT.md` | §2 wording **approved** (CR-PUBLIC-2A). The section W script can't be found. A reconstructed, locally tested procedure is proposed (CR-PUBLIC-2A-FIX): `CR-PUBLIC-2A-FIX-AI-PERMISSION-RUNBOOK.md`; not authorized |
| 2 | **Provider-level AI spend limit** for the key in `CREATOR_RECORD_EXTRACTION_API_KEY` (Vercel `si8-creator-portal`, Production) | In the Anthropic Console: which organization and workspace the key belongs to; that the workspace has a spend limit that **rejects requests** when reached (a hard limit, not only a notification); the amount. Record it in `SI8-private-evidence`, never the key | **Operator-confirmed PASS (CR-PUBLIC-2A).** No organization, workspace, amount or enforcement type was seen by engineering; record them in `SI8-private-evidence` |
| 3 | **Discount codes:** retained as decided. Before public checkout, review in Stripe which promotion codes are active, each code's redemption limit, expiry and restrictions. Several code names, including 100% `COMP-*` codes, appear in this **public** repository (`claude.md`, CRM and UAT notes) | A dated list (names, percentage, remaining redemptions, expiry) in `SI8-private-evidence`; your explicit acceptance of any 100% code that stays redeemable | **Operator-confirmed PASS (CR-PUBLIC-2A).** Codes not seen by engineering |
| 4 | **Close the historical anomaly:** the 2026-10-21 ledger row, `rejected` / `payment_status_inconsistent`, $0 (subtotal 2900, discount 2900), anomaly `open`. The $0 "paid" case later fixed by FIX-1; no money moved | The anomaly marked resolved through the existing admin process, with a note | Open |
| 5 | **Real US$29 payment and refund UAT** (SI8's own card, separately authorized). An internal account with an invitation row, while access is still `'invitation'` | Ledger row `accepted` with `amount_total` 2900 and a `pi_` intent; record issued; confirmation email; PDF downloads; then a manual Stripe refund and its reconciliation note. Exclude the record from customer counts | Never done: all 10 historical checkouts were $0 |
| 6 | **Two-account isolation:** a second, non-admin account (invitation row for the test) | The second account can't see, review, buy, read documents of, or download the first account's drafts, documents, submissions or PDF (404 everywhere); admin access logged | Not done in Production (code and tests cover it) |
| 7 | **Sign-up and email:** a new account through `https://app.superimmersive8.com/auth/signup?next=/creator-record` | Turnstile shown; confirmation email received; the link returns to `/creator-record`. Confirm in Supabase that captcha is enforced server-side and auth rate limits are set | Email confirmation required (Supabase `mailer_autoconfirm: false`, verified); captcha enforcement and rate limits unverified. `/api/notify-signup` removed; the notification is now sent from `/auth/callback` after the confirmation code exchange, escaped (CR-PUBLIC-2A-FIX, local) |
| 8 | **Open public access:** the release changing `CREATOR_RECORD_V2_ACCESS` to `'public'` (and the test pinning `'invitation'`) | Founder release authorization; deploy; a **new non-admin account with no invitation row** completes sign-up → questionnaire → (optional) document and AI reading → checkout → issuance → download | — |
| 9 | **Website calls to action:** only after step 8 passes | The changes in `08_Platform/implementation/si8-web/SI8-WEB-LAUNCH-3A-CREATOR-RECORD-PUBLIC-LAUNCH-READINESS.md` §4 (on the website branch), plus the website blockers (Website Privacy Notice, `/sample`, legacy endpoints, contact-form configuration) | — |
| 10 | **First-week watch** | Daily: payment ledger anomalies and `needs_reconciliation`; issuance alerts; the retention sweep; refunds and support emails at `jd@superimmersive8.com`; AI spend against the provider limit | — |

## Rollback

- **Access:** set `CREATOR_RECORD_V2_ACCESS` back to `'invitation'` and deploy. Uninvited creators are refused at every entry
  point again. Their drafts and documents stay stored. Paid orders still issue and download, because fulfilment doesn't depend
  on access.
- **Terms:** see the draft's rollback notes. The authority row must match the deployed Terms version, otherwise AI reading fails
  closed (safe).
- **Never** deploy a build without the takeover guard (Creator Record README, "Current state").
